# 🗞️ Veille Franchise TLF

Envoi automatique d'une veille concurrentielle quotidienne par email, générée par Claude AI.

## Variables d'environnement à configurer sur Vercel

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Ta clé API Anthropic (sk-ant-...) |
| `GMAIL_USER` | Ton adresse Gmail expéditeur |
| `GMAIL_APP_PASSWORD` | Mot de passe d'application Gmail |
| `EMAIL_RECIPIENTS` | Emails destinataires séparés par virgule |
| `CRON_SECRET` | Token secret pour sécuriser l'endpoint |

## Déploiement

1. Push ce repo sur GitHub
2. Importe sur Vercel
3. Configure les variables d'environnement
4. La veille s'envoie automatiquement du lundi au vendredi à 7h (heure de Paris)

## Test manuel

Une fois déployé, teste en appelant :
```
https://ton-app.vercel.app/api/veille?token=TON_CRON_SECRET
```

## Mot de passe d'application Gmail

1. Va sur myaccount.google.com
2. Sécurité → Validation en 2 étapes (doit être activée)
3. Mots de passe des applications
4. Crée un mot de passe pour "Mail"
5. Utilise ce mot de passe dans GMAIL_APP_PASSWORD
