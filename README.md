# TP Docker — Réplication PostgreSQL, Cache Redis & Haute Disponibilité

## 🎯 Objectifs pédagogiques

À l’issue de ce TP, vous serez capables de :
- Mettre en place une **réplication PostgreSQL** (Primary → Replica)
- Comprendre la différence entre **réplication** et **haute disponibilité**
- Router correctement les **écritures** et les **lectures**
- Implémenter un **cache Redis** (cache-aside, TTL, invalidation)
- Tester des **pannes réalistes** (DB, cache)
- Mettre en œuvre une **bascule (failover)** vers une nouvelle base primaire

---

## 🧱 Architecture cible

```
        ┌────────────┐
        │    API     │
        └─────┬──────┘
              │ DB (unique)
        ┌─────▼──────┐
        │  HAProxy   │
        └───┬─────┬──┘
            │     │
   ┌────────▼─┐ ┌─▼────────┐
   │ DB Primary│ │ DB Replica│
   └───────────┘ └───────────┘

        ┌────────────┐
        │   Redis    │
        └────────────┘
```

---

## ⏱️ Durée estimée
2 à 3 heures

---

## 📦 Prérequis

- Docker + Docker Compose
- Node.js (Express)
- Connaissances de base SQL et API REST

---

## 📤 Livrables attendus

1. Un push sur une branche a votre nom :
   - `docker-compose.yml`
   - le code de l’API
   - la configuration HAProxy
2. Un mini-rapport (≈ 1 page) :
   - schéma d’architecture
   - stratégie de lecture/écriture
   - stratégie de cache
   - mesures avant/après cache
   - retour sur la haute disponibilité

---

# PARTIE A — Mise en place Docker (20 min)

## A1. Créer le fichier `docker-compose.yml`

```yaml
services:
  db-primary:
    image: bitnami/postgresql:16
    environment:
      - POSTGRESQL_USERNAME=app
      - POSTGRESQL_PASSWORD=app_pwd
      - POSTGRESQL_DATABASE=appdb
      - POSTGRESQL_REPLICATION_MODE=master
      - POSTGRESQL_REPLICATION_USER=repl
      - POSTGRESQL_REPLICATION_PASSWORD=repl_pwd
    ports:
      - "5432:5432"

  db-replica:
    image: bitnami/postgresql:16
    depends_on:
      - db-primary
    environment:
      - POSTGRESQL_USERNAME=app
      - POSTGRESQL_PASSWORD=app_pwd
      - POSTGRESQL_DATABASE=appdb
      - POSTGRESQL_REPLICATION_MODE=slave
      - POSTGRESQL_MASTER_HOST=db-primary
      - POSTGRESQL_MASTER_PORT_NUMBER=5432
      - POSTGRESQL_REPLICATION_USER=repl
      - POSTGRESQL_REPLICATION_PASSWORD=repl_pwd
    ports:
      - "5433:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  haproxy:
    image: haproxy:2.9
    depends_on:
      - db-primary
      - db-replica
    ports:
      - "5439:5432"
    volumes:
      - ./haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
```

---

## A2. Lancer les services

```bash
docker compose up -d
docker compose ps
```

✅ Tous les services doivent être **UP**.

---

# PARTIE B — Vérifier la réplication PostgreSQL (30 min)

## B1. Vérifier le rôle des bases

### Primary
```bash
docker exec -it db-primary psql -U app -d appdb
SELECT pg_is_in_recovery();
```
➡️ Résultat attendu : `false`

### Replica
```bash
docker exec -it db-replica psql -U app -d appdb
SELECT pg_is_in_recovery();
```
➡️ Résultat attendu : `true`

---

## B2. Tester la réplication

Sur le **primary** :

```sql
CREATE TABLE products(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO products(name, price_cents)
VALUES ('Keyboard', 4999);
```

Sur la **replica** :

```sql
SELECT * FROM products;
```

➡️ La ligne doit apparaître après quelques secondes.

---

# PARTIE C — HAProxy comme point d’entrée DB (20 min)

## C1. Créer `haproxy/haproxy.cfg`

```cfg
global
  maxconn 256

defaults
  mode tcp
  timeout connect 5s
  timeout client 30s
  timeout server 30s

frontend psql
  bind *:5432
  default_backend pg_primary

backend pg_primary
  option tcp-check
  tcp-check connect
  server primary db-primary:5432 check
```

```bash
docker compose restart haproxy
```

---

# PARTIE D — API : lectures, écritures et cache Redis (90 min)

## D1. Principe
- **Writes** → PostgreSQL primary (via HAProxy)
- **Reads** → PostgreSQL replica
- **Cache-aside** sur Redis pour `GET /products/:id`

---

## D2. Implémenter le cache Redis

Règles :
- Clé : `product:{id}`
- TTL : 30 à 120 secondes (à justifier)
- Cache-aside :
  1. Lecture Redis
  2. Miss → DB replica
  3. Mise en cache

---

## D3. Invalidation

Lors d’un `PUT /products/:id` :
- Mettre à jour le primary
- Supprimer la clé Redis correspondante

---

## D4. Expérience de cohérence

1. Modifier un produit
2. Lire immédiatement après

❓ Question :
Pourquoi peut-on lire une ancienne valeur ?


```
Nous pouvons lire une ancienne valeur car celle-ci est toujours enregistré en cache et que le ttl n'est pas terminé ou bien est toujours présente dans la base de donnée secondaire dû à la latence de réplication.
```



➡️ Expliquez :
- latence de réplication
- effet du cache

```
Latence de réplication :
Temps que mets la requête à parcourir le réseau et à s'éxécuter sur la seconde base de donnée.
Effet du cache :
Le cache permet de ne pas requêter une base de donnée lorsque celle-ci a déjà retourné une réponse à une requête similaire.
Attention, en fonction du ttl, des données non à jour peuvent être renvoyé.
```

---

# PARTIE E — Résilience : pannes contrôlées (30 min)

## E1. Panne Redis

```bash
docker compose stop redis
```

➡️ L’API doit continuer à fonctionner (sans cache).

---

## E2. Panne de la replica

```bash
docker compose stop db-replica
```

➡️ Choisissez :
- fallback vers primary

---

# PARTIE F — Haute Disponibilité PostgreSQL (60 min)

## F1. Test : arrêt du primary

```bash
docker compose stop db-primary
```

➡️ Les écritures échouent  
➡️ Conclusion : réplication ≠ HA

---

## F2. Promotion de la replica

```bash
docker exec -it db-replica pg_ctl promote -D /bitnami/postgresql/data
```

```sql
SELECT pg_is_in_recovery();
```

➡️ Résultat attendu : `false`

---

## F3. Bascule HAProxy

Modifier `haproxy.cfg` :

```cfg
backend pg_primary
  option tcp-check
  tcp-check connect
  server primary db-replica:5432 check
```

```bash
docker compose restart haproxy
```

---

## F4. Test de continuité

Relancer une écriture via l’API.

➡️ Le service doit refonctionner sans modifier l’API.

---

## 📝 Questions finales (rapport)

1. Différence entre réplication et haute disponibilité ?

La réplication sert à copier les données (souvent pour améliorer les lectures), tandis que la haute disponibilité sert à garantir que le service reste accessible automatiquement en cas de panne.

2. Qu’est-ce qui est manuel ici ? Automatique ?
3. Risques cache + réplication ?

Que le cache et la réplication ne soit pas iso

4. Comment améliorer cette architecture en production ?

Mettre l'api dans le réseau docker
Reconnecter le cache si le redis se ré-up


---

## 📊 Barème indicatif /20

- Docker & lancement : 3
- Réplication : 5
- Cache Redis : 5
- Résilience : 3
- Haute disponibilité : 4

---

## 🚀 Bonus
- Anti cache-stampede
- Failover automatique (Patroni)
- HA Redis (Sentinel)
