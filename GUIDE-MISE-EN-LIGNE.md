# Mise en ligne du site du Dr Soma Traoré

## Étape 1. Brancher le formulaire sur Google Sheets (10 minutes)

Les demandes de rendez-vous arrivent dans un tableau Google que le cabinet consulte depuis son téléphone. Utilisez le compte Google du cabinet (ou celui du docteur), pas un compte personnel : c'est lui qui détiendra les données des patients.

1. Sur sheets.google.com, créez un tableur vierge nommé « Rendez-vous Dr Traoré ».
2. Menu **Extensions > Apps Script**. Supprimez le code présent, collez tout le contenu de `google-sheets/Code.gs`.
3. Si le docteur veut un email à chaque demande, remplissez `NOTIFY_EMAIL` en haut du script avec son adresse.
4. Choisissez la fonction **installer** dans la liste en haut, cliquez sur **Exécuter**, puis acceptez les autorisations (Google affiche un avertissement « application non validée » : cliquez sur Paramètres avancés puis sur « Accéder à… »). Un onglet « Demandes » apparaît avec ses colonnes.
5. **Déployer > Nouveau déploiement > Type : Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde** 
6. Copiez l'URL qui se termine par `/exec`. 
7. Dans `site/assets/js/main.js`, collez cette URL dans `SHEET_ENDPOINT = "";`.
8. Testez : envoyez une demande depuis le site, elle doit apparaître dans l'onglet « Demandes » avec le statut « Nouveau ».

Après toute modification du script, faites **Déployer > Gérer les déploiements > Modifier > Nouvelle version**, sinon l'ancienne version reste active.

Protections intégrées : champ piège contre les robots, délai minimum de remplissage, 3 demandes par heure et par numéro, 60 par heure au total, validation côté serveur, protection contre l'injection de formules. Gardez le tableur privé : ne le partagez qu'avec le personnel du cabinet.

## Étape 2. Remplacer ce qui est provisoire

| Quoi | Où |
|---|---|
| Domaine `www.drsomatraore.com` | `index.html`, `sitemap.xml`, `robots.txt`, `.htaccess` (rechercher/remplacer) |
| Email du cabinet (quand connu) | `NOTIFY_EMAIL` dans `Code.gs` |
| Photo | `site/assets/img/portrait.jpg` (déjà en place, remplaçable par une photo nette prise de face) |

## Étape 3. Hébergement

Le dossier `site/` se dépose tel quel sur Netlify, Cloudflare Pages ou Firebase Hosting (gratuits, HTTPS automatique). Sur Netlify et Cloudflare Pages, le fichier `_headers` applique les en-têtes de sécurité. Sur un hébergement Apache classique, c'est `.htaccess`. Pour Firebase Hosting, recopiez les en-têtes de `_headers` dans la section `headers` de `firebase.json`.

Ensuite : ajoutez le site dans Google Search Console, envoyez `sitemap.xml`, et créez la fiche Google Business Profile de la clinique et du cabinet (avec les horaires).
