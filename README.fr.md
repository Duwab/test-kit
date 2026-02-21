# Test Kit - Guide de Démarrage Rapide (FR)

Un package npm TypeScript pour faciliter les tests e2e de micro-services NodeJS et TypeScript dans les architectures distribuées.

## Installation

```bash
npm install -D @duwab/test-kit
```

## Démarrage des Services

Pour démarrer tous les services (RabbitMQ, Redis, Elasticsearch, MySQL) :

```bash
docker-compose up -d
```

## Exemples d'Utilisation

### RabbitMQ

```typescript
import { RabbitMQClient } from '@duwab/test-kit';

const client = new RabbitMQClient({
  host: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
});

await client.connect();

// Obtenir toutes les files d'attente
const queues = await client.getAllQueues();

// Déclarer une file d'attente
await client.declareQueue('ma-queue');

// Publier un message
await client.publishMessage('', 'ma-queue', { data: 'test' });

// Sauvegarder l'état
await client.dump('./snapshot-rabbitmq.json', { pretty: true });

await client.disconnect();
```

### Redis

```typescript
import { RedisClient } from '@duwab/test-kit';

const client = new RedisClient({
  host: 'localhost',
  port: 6379,
});

await client.connect();

// Définir une valeur
await client.set('clé', 'valeur', 3600);

// Récupérer une valeur
const valeur = await client.get('clé');

// Obtenir toutes les clés
const keys = await client.getAllKeys('user:*');

// Vider la base de données
await client.flushDB();

// Sauvegarder/restaurer l'état
await client.dump('./snapshot-redis.json');
await client.restore('./snapshot-redis.json');

await client.disconnect();
```

### Elasticsearch

```typescript
import { ElasticSearchClient } from '@duwab/test-kit';

const client = new ElasticSearchClient({
  host: 'localhost',
  port: 9200,
});

await client.connect();

// Créer un index
await client.createIndex('produits');

// Indexer un document
await client.indexDocument('produits', '1', {
  nom: 'Produit 1',
  prix: 99.99,
});

// Obtenir un document
const doc = await client.getDocument('produits', '1');

// Rechercher des documents
const resultats = await client.search({
  index: 'produits',
  query: { match_all: {} },
});

// Sauvegarder l'état
await client.dump('./snapshot-elasticsearch.json', { pretty: true });

await client.disconnect();
```

### MySQL

```typescript
import { MySQLClient } from '@duwab/test-kit';

const client = new MySQLClient({
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'test',
});

await client.connect();

// Créer une table
await client.query(`
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE
  )
`);

// Insérer des données
const userId = await client.insert('utilisateurs', {
  nom: 'Jean Dupont',
  email: 'jean@example.com',
});

// Requête
const utilisateurs = await client.queryAll('SELECT * FROM utilisateurs');
const utilisateur = await client.queryOne('SELECT * FROM utilisateurs WHERE id = ?', [userId]);

// Mettre à jour
await client.update('utilisateurs', { nom: 'Jane Dupont' }, { email: 'jean@example.com' });

// Supprimer
await client.delete('utilisateurs', { id: userId });

// Infos de la table
const tableInfo = await client.getTableInfo('utilisateurs');

// Sauvegarder l'état
await client.dump('./snapshot-mysql.json', { pretty: true });

await client.disconnect();
```

## Utilisation en Tests

```typescript
describe('Mon test E2E', () => {
  let client: RabbitMQClient;

  beforeAll(async () => {
    client = new RabbitMQClient({ host: 'localhost' });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(async () => {
    // Sauvegarder l'état avant chaque test
    await client.dump('./snapshots/clean.json');
  });

  afterEach(async () => {
    // Restaurer l'état après chaque test
    await client.restore('./snapshots/clean.json');
  });

  test('devrait gérer les files d\'attente', async () => {
    await client.declareQueue('test-queue');
    // Votre test ici
  });
});
```

## Commandes NPM

```bash
# Construire le projet
npm run build

# Mode développement avec rechargement
npm run dev

# Lancer les tests
npm run test

# Lancer les tests e2e avec Docker
npm run test:e2e

# Vérifier la syntaxe
npm run lint

# Formater le code
npm run format
```

## Commandes Make

```bash
# Installer les dépendances
make install

# Construire
make build

# Démarrer les services
make start-services

# Arrêter les services
make stop-services

# Tests complets
make test-e2e

# Voir les logs
make logs
```

## Configuration d'Environnement

Créez un fichier `.env` à partir de `.env.example` :

```bash
cp .env.example .env
```

Configurez les variables d'environnement selon votre setup.

## Services Docker Disponibles

- **RabbitMQ**: http://localhost:15672 (guest/guest)
- **Redis**: localhost:6379
- **Elasticsearch**: http://localhost:9200

## Caractéristiques Principales

### RabbitMQ
- Gestion des files d'attente (créer, supprimer, vider)
- Gestion des exchanges et des bindings
- Publication de messages
- Statistiques des files
- Sauvegarde/restauration via Management API

### Redis
- Opérations clé-valeur
- Requêtes par motif
- Gestion de TTL
- Flush base de données
- Sauvegarde/restauration

### Elasticsearch
- Gestion d'index
- CRUD sur les documents
- Recherche full-text
- Opérations en masse
- Sauvegarde/restauration

## Documentation Complète

- 📚 [README Principal](./README.md)
- 🚀 [Guide de Démarrage Rapide](./QUICKSTART.md)
- 🛠️ [Guide de Développement](./DEVELOPMENT.md)
- 🤝 [Contribuer](./CONTRIBUTING.md)
- 📝 [Exemples](./examples/usage.ts)

## Structure du Projet

```
test-kit/
├── src/
│   ├── base.ts                    # Classes et interfaces de base
│   ├── types.ts                   # Définitions de types
│   ├── index.ts                   # Export principal
│   └── clients/
│       ├── rabbitmq.ts            # Client RabbitMQ
│       ├── redis.ts               # Client Redis
│       └── elasticsearch.ts       # Client Elasticsearch
├── tests/                         # Tests e2e
├── examples/                      # Exemples d'utilisation
├── docker-compose.yml             # Configuration Docker
└── ...
```

## Dépannage

### Les services ne démarrent pas

```bash
# Vérifier l'état des services
docker-compose ps

# Voir les logs
docker-compose logs
```

### Erreurs de connexion

- Vérifier que Docker est en cours d'exécution
- Vérifier les variables d'environnement
- Vérifier les ports : 5672 (RabbitMQ), 6379 (Redis), 9200 (Elasticsearch)

### Les tests s'exécutent lentement

- Augmenter le timeout dans les tests
- Vérifier la disponibilité des services
- Vérifier les ressources système

## Licence

MIT

## Besoin d'aide ?

- 📖 Consultez la [documentation complète](./README.md)
- 🔍 Regardez les [exemples](./examples/usage.ts)
- 🧪 Consultez les [tests](./tests/e2e/)
- 📝 Lisez le [guide de contribution](./CONTRIBUTING.md)

---

**Prêt à commencer ?** → Lancez `docker-compose up -d` et explorez les exemples! 🚀
