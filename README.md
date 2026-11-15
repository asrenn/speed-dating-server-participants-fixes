# Speed dating – serveur d'envoi de SMS

Petit serveur Node.js : il héberge l'appli et envoie les SMS via Twilio à chaque nouveau tour.
Aucun numéro ni message n'est enregistré ni écrit dans les logs.

## 1. Compte Twilio
1. Créez un compte sur twilio.com et notez **Account SID** et **Auth Token** (console).
2. Choisissez l'expéditeur (`TWILIO_FROM`) : un numéro Twilio, un nom alphanumérique (ex. `SpeedDating`, 11 caractères max, les destinataires ne peuvent pas répondre) ou un Messaging Service (`MG...`). Les règles varient selon le pays : vérifiez dans la console Twilio.
3. En compte d'essai, Twilio n'envoie qu'aux numéros que vous avez vérifiés. Passez en compte payant pour l'événement réel (tarif par SMS : voir la grille Twilio pour la France).

## 2. Tester sur votre ordinateur (facultatif, vous pouvez passer à l'étape 3)
Il faut avoir installé Node.js 20.6 ou plus (nodejs.org). Ouvrez un terminal **dans ce dossier**, puis :
```
npm install
cp .env.example .env
npm run dev
```
(Sous Windows, remplacez `cp` par `copy`.) Avant `npm run dev`, ouvrez le fichier `.env` avec le Bloc-notes et changez `ORGANIZER_PASSWORD`.
Ouvrez ensuite http://localhost:3000 : tant que `DRY_RUN=1` est dans `.env`, aucun SMS réel n'est envoyé.
Pour un vrai test : renseignez les 3 lignes TWILIO_* dans `.env` et supprimez la ligne `DRY_RUN=1`.

## 3. Mettre en ligne (ex. Render.com)
1. Déposez ce dossier sur GitHub (le `.env` est ignoré par `.gitignore`).
2. Render > New > Web Service > votre dépôt. Build : `npm install`. Start : `npm start`.
3. Dans « Environment », ajoutez `ORGANIZER_PASSWORD`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.
4. Ouvrez l'adresse fournie (HTTPS) sur votre téléphone ou ordinateur.

## 4. Utilisation
Dans l'appli : importez les réponses, saisissez les numéros des accompagnants, générez le planning, puis dans « Envoi automatique » saisissez le mot de passe et cliquez sur **Connecter**. À chaque nouveau tour, les SMS partent tout seuls (les boutons manuels restent disponibles en secours).

## RGPD
Les numéros sont des données personnelles : informez les participants/accompagnants de l'usage de leur numéro, ne les conservez pas après l'événement.
