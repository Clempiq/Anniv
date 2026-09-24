# 🎂 Anniv — rappels d'anniversaires

Petite application web (PWA) pour noter les anniversaires de ses proches et ne plus jamais les oublier.
Aucun serveur, aucun compte : tout reste sur votre appareil, et l'app fonctionne hors ligne.

## Fonctionnalités

- **Liste « À venir »** triée par proximité, avec compte à rebours, âge atteint, séparateurs par mois,
  recherche, filtre par groupe (Famille, Amis, Travail… ou vos propres groupes) et plusieurs tris.
- **Bannière du jour** avec confettis quand c'est l'anniversaire de quelqu'un 🎉
- **Rappels** configurables (le jour J, la veille, 2/3 jours, 1/2 semaines, 1 mois avant),
  globalement ou par personne :
  - notifications du navigateur (et en arrière-plan sur Chrome Android quand l'app est installée) ;
  - **export iCalendar (.ics)** avec alarmes, pour des rappels garantis dans Google Agenda, Apple Calendrier ou Outlook.
- **Calendrier** mensuel.
- **Fiche détaillée** : âge, signe astrologique, signe chinois, jour de naissance, nombre de jours vécus,
  notes, **idées cadeaux** (liste à cocher), suivi « j'ai souhaité l'anniversaire » avec historique.
- **Messages de vœux** générés (chaleureux, drôle, pro, âge rond) à copier, partager, ou envoyer
  directement par SMS, WhatsApp ou e-mail.
- **Âges ronds** mis en avant (18, 20, 25, 30, 40, 50…).
- **Statistiques** : répartition par mois, par groupe, par signe, âge moyen, plus jeune / doyen.
- **Import / export** : sauvegarde JSON, CSV (`nom;JJ/MM/AAAA;groupe;notes`), import de contacts vCard (.vcf).
- Gestion du **29 février** (fêté le 28 les années non bissextiles).
- Thème clair / sombre / automatique, installable sur l'écran d'accueil, raccourcis clavier
  (`n` = nouvel anniversaire, `/` = rechercher), annulation après suppression.

## Lancer en local

```bash
npm start          # sert le dossier sur http://localhost:8080
# ou : python3 -m http.server 8080
```

Aucune dépendance, aucune étape de build : ce sont des fichiers statiques.

## Tests

```bash
npm test
```

Les tests couvrent la logique métier (`js/lib.js`) : calcul des dates et des âges, 29 février,
zodiaques, rappels, imports CSV/vCard, export ICS.

## Mise en ligne (GitHub Pages)

Dans *Settings → Pages* du dépôt, choisir « Deploy from a branch », la branche voulue et le dossier `/ (root)`.
L'app sera accessible sur `https://<utilisateur>.github.io/<dépôt>/` et installable sur téléphone.

## Structure

```
index.html              interface
css/style.css           styles (clair/sombre, responsive)
js/lib.js               logique pure (dates, rappels, import/export) — testée
js/app.js               interface et interactions
sw.js                   service worker (hors ligne + rappels en arrière-plan)
manifest.webmanifest    manifeste PWA
tests/lib.test.js       tests (node:test)
```
