# AUREON AI — Phase 1
## Obtenir une adresse web (Vercel, gratuit, ~5 min)
1. Crée un dépôt GitHub et envoie-y le contenu de ce dossier.
2. Sur vercel.com : Add New > Project > importe le dépôt.
3. Dans Environment Variables, ajoute SESSION_SECRET = une longue phrase aléatoire (32+ caractères).
4. Deploy. Tu obtiens https://ton-projet.vercel.app
Chaque visiteur entre sa propre clé Groq (console.groq.com/keys).
## En local
    npm install && npm run dev
## Sécurité
Clé validée côté serveur, chiffrée AES-256-GCM dans un cookie httpOnly/SameSite=Strict (8 h), jamais en localStorage ni loggée. HTTPS fourni par Vercel.
