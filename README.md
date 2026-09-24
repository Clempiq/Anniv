# 🎂 Anniv

Application Android (React Native + Expo) pour noter les anniversaires de ses proches, recevoir des rappels
**et ne plus jamais oublier d'acheter le cadeau**. Tout reste sur le téléphone : pas de compte, pas de serveur.

## Télécharger l'APK

Chaque push déclenche le workflow **Android APK** (onglet *Actions*), qui compile l'application et publie
une pré-version dans l'onglet **Releases** du dépôt avec le fichier `anniv-…apk` en pièce jointe.

Sur le téléphone : ouvrir la page de la release, télécharger l'APK, l'ouvrir et accepter l'installation
depuis le navigateur si Android le demande. Au premier lancement, aller dans **Réglages → Activer les notifications**.

## Fonctionnalités

- **À venir** : anniversaires triés par proximité, âge atteint, recherche, filtres par groupe, tri par nom ou âge,
  bannière le jour J.
- **Notifications** (même app fermée, reprogrammées après un redémarrage du téléphone) :
  - rappels d'anniversaire configurables (le jour J, la veille, 2/3 jours, 1/2 semaines, 1 mois avant),
    globalement ou personne par personne ;
  - **rappels pour acheter le cadeau** (par défaut 2 semaines et 3 jours avant) avec les idées et le budget,
    et deux boutons directement dans la notification : **« Cadeau acheté »** et **« Rappeler demain »** ;
  - heure d'envoi au choix ; boutons de test.
- **Cadeaux** : liste des cadeaux à acheter sur 30/60/90 jours ou 1 an, budget total, bouton « Acheté ».
- **Fiche** : âge, signe astrologique et chinois, jour de naissance, jours vécus, notes, idées cadeaux à cocher,
  budget, suivi « j'ai souhaité l'anniversaire » avec historique.
- **Messages de vœux** (chaleureux, drôle, pro, âge rond) à copier, partager, ou envoyer par SMS, WhatsApp, e-mail.
- **Calendrier** mensuel et **statistiques** (par mois, groupe, signe, âges ronds à venir, budget du mois).
- **Import des anniversaires depuis les contacts** du téléphone, import/export CSV, sauvegarde/restauration JSON.
- Gestion du 29 février, thème clair/sombre/automatique.

## Développement

```bash
npm install
npm test            # tests de la logique (dates, rappels, imports)
npm run typecheck   # vérification TypeScript
npx expo run:android   # lancer sur un téléphone/émulateur (Android SDK requis)
```

L'app utilise des modules natifs (notifications, contacts, tâches de fond) : elle ne fonctionne pas dans Expo Go,
il faut un build de développement (`npx expo run:android`) ou l'APK.

```
src/app/                 écrans (Expo Router)
  (tabs)/                À venir, Calendrier, Cadeaux, Stats, Réglages
  person/[id].tsx        fiche d'une personne
  edit.tsx               ajout / modification
  import-contacts.tsx    import depuis les contacts
src/lib/birthdays.ts     logique pure : dates, âges, signes, vœux, CSV
src/lib/planner.ts       calcul des notifications à programmer
src/lib/notifications.ts programmation (expo-notifications), canaux et boutons d'action
src/lib/background.ts    tâche de fond qui reprogramme les rappels
src/lib/store.tsx        état de l'app + sauvegarde (AsyncStorage)
tests/                   tests (node:test)
```

## Publier sur le Play Store

L'APK des releases est signé avec une clé de debug : parfait pour tester, mais le Play Store exige un
**Android App Bundle (.aab)** signé avec une clé de production. Le plus simple est EAS (service d'Expo), déjà configuré
dans `eas.json` :

1. Créer un compte Expo, puis `npx eas-cli@latest login` et `npx eas-cli@latest init`.
2. `npx eas-cli@latest build --platform android --profile production` : EAS génère et conserve la clé de signature,
   et produit le `.aab`.
3. Créer l'application dans la [Google Play Console](https://play.google.com/console) (compte développeur : 25 $ une fois),
   remplir la fiche (description, captures, politique de confidentialité — l'app ne collecte aucune donnée),
   puis `npx eas-cli@latest submit --platform android` (piste de test interne).

Identifiant de l'application : `com.clempiq.anniv` (définitif une fois publiée ; à changer dans `app.json` avant si besoin).
