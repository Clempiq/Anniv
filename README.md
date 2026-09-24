# 🎂 Anniv

Application Android (React Native + Expo) pour noter les anniversaires de ses proches, recevoir des rappels
**et ne plus jamais oublier d'acheter le cadeau**. Tout reste sur le téléphone : pas de compte, pas de serveur.

## Télécharger l'APK

Chaque push déclenche le workflow **Android APK** (onglet *Actions*), qui compile l'application et publie
une pré-version dans l'onglet **Releases** du dépôt avec le fichier `anniv-…apk` en pièce jointe.

Sur le téléphone : ouvrir la page de la release, télécharger l'APK, l'ouvrir et accepter l'installation
depuis le navigateur si Android le demande. Au premier lancement, aller dans **Réglages → Activer les notifications**.

## Fonctionnalités

**Tableau de bord** — salutation, grand compte à rebours vers le prochain événement (anneau animé, dégradé propre
à chaque personne), confettis le jour J, « Il n’est pas trop tard » pour les oublis récents, la semaine en cartes,
cadeaux à préparer, moments spéciaux (fêtes des prénoms, fête des mères/pères/grands-parents, 10 000e jour…).

**Tous les événements** — anniversaires, anniversaires de mariage (avec le nom des noces : coton, étain, or…),
de couple, souvenirs (ton adapté, sans cadeau), événements libres. Photo ou emoji, lien (Maman, collègue…),
groupe, favoris, centres d’intérêt, fête du prénom détectée automatiquement, saisie éclair
(« Julie Martin 12 mars 1990 famille »).

**Notifications** (même app fermée, reprogrammées au redémarrage et par une tâche de fond) :
rappels J-x configurables, rappels cadeau avec boutons « Cadeau acheté » / « Rappeler demain »,
bouton « C’est fait » sur les rappels d’anniversaire, relance à 20 h si pas encore souhaité, récap du dimanche,
fêtes des prénoms, fêtes des mères/pères/grands-parents, jalons insolites, et ton propre anniversaire.

**Cadeaux** — idées avec prix et lien, suivi idée → acheté → emballé → offert, budget par personne,
suggestions hors ligne selon les centres d’intérêt, l’âge et le budget, historique « déjà offert ».

**Messages & cartes** — vœux par ton (chaleureux, drôle, poétique, court, pro, romantique, enfant, âge rond,
en retard), envoi direct par WhatsApp, SMS, e-mail ; cartes de vœux illustrées (8 thèmes, photo possible)
partagées en image.

**Agenda** — liste (filtres, tris, actions rapides à l’appui long), calendrier mensuel, vue annuelle, recherche plein texte.

**Moi** — bilan de l’année, série de vœux, 13 badges, statistiques.

**Réglages** — thème clair/sombre, 5 couleurs d’accent, verrou par empreinte/visage, synchronisation avec
l’agenda du téléphone, export .ics / CSV / JSON, sauvegardes automatiques hebdomadaires avec restauration.

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
  (tabs)/                Accueil, Agenda, Cadeaux, Moi (+ barre d'onglets flottante)
  person/[id].tsx        fiche (cadeaux, message, profil)
  card/[id].tsx          carte de vœux partageable
  edit.tsx, onboarding.tsx, settings.tsx, search.tsx, import-contacts.tsx
src/components/          design system (ui, Sheet, Confetti, TabBar, toast)
src/lib/birthdays.ts     logique pure : modèle, dates, âges, signes, CSV, ICS
src/lib/calendarfr.ts    fêtes des prénoms, Pâques, fêtes des mères/pères, noces
src/lib/wishes.ts        messages de vœux
src/lib/gifts.ts         suggestions de cadeaux
src/lib/insights.ts      oublis, jalons, série, badges, bilan
src/lib/quickadd.ts      saisie éclair
src/lib/planner.ts       calcul des notifications à programmer
src/lib/device.ts        photos, sauvegardes, agenda, verrou, envoi de messages
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
