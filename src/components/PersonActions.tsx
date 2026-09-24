import { router } from 'expo-router';

import { firstName, occurrenceYear, type Person } from '../lib/birthdays';
import { useStore } from '../lib/store';
import { useTheme } from '../theme';
import { useConfetti } from './Confetti';
import { Sheet } from './Sheet';
import { useToast } from './toast';
import { Avatar, Divider, haptic, ListRow, Row, Txt } from './ui';

/** Actions rapides (appui long sur une personne). */
export function PersonActions({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const confetti = useConfetti();
  const { updatePerson, removePerson, restorePerson } = useStore();
  if (!person) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;
  const year = occurrenceYear(person);
  const wished = !!person.celebrated[year];
  const bought = !!person.giftBought[year];
  const go = (fn: () => void) => {
    onClose();
    setTimeout(fn, 200);
  };
  return (
    <Sheet visible={!!person} onClose={onClose}>
      <Row gap={12} style={{ marginBottom: 12 }}>
        <Avatar person={person} size={48} />
        <Txt variant="h1" style={{ flex: 1 }} numberOfLines={1}>{person.name}</Txt>
      </Row>
      <ListRow icon="chatbubble-ellipses" title="Écrire un message" onPress={() => go(() => router.push({ pathname: '/person/[id]', params: { id: person.id, compose: '1' } }))} />
      <ListRow icon="color-palette" color="#7C5CFF" title="Créer une carte de vœux" onPress={() => go(() => router.push({ pathname: '/card/[id]', params: { id: person.id } }))} />
      <ListRow
        icon={wished ? 'close-circle' : 'checkmark-circle'}
        color={t.ok}
        title={wished ? `Annuler « souhaité » ${year}` : `Marquer comme souhaité (${year})`}
        onPress={() => go(() => {
          updatePerson(person.id, (p) => {
            const c = { ...p.celebrated };
            if (wished) delete c[year];
            else c[year] = new Date().toISOString();
            return { ...p, celebrated: c };
          });
          if (!wished) {
            haptic('success');
            confetti();
            toast(`Bravo, ${firstName(person)} est souhaité·e ! 🎉`);
          }
        })}
      />
      {person.giftReminder && (
        <ListRow
          icon="gift"
          color="#FF8A5B"
          title={bought ? 'Cadeau pas encore acheté' : 'Cadeau acheté'}
          onPress={() => go(() => updatePerson(person.id, (p) => {
            const g = { ...p.giftBought };
            if (bought) delete g[year];
            else g[year] = new Date().toISOString();
            return { ...p, giftBought: g };
          }))}
        />
      )}
      <ListRow
        icon={person.favorite ? 'star' : 'star-outline'}
        color={t.warn}
        title={person.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        onPress={() => go(() => updatePerson(person.id, (p) => ({ ...p, favorite: !p.favorite })))}
      />
      <ListRow icon="create" color={t.muted} title="Modifier" onPress={() => go(() => router.push({ pathname: '/edit', params: { id: person.id } }))} />
      <Divider />
      <ListRow
        icon="trash"
        danger
        title="Supprimer"
        onPress={() => go(() => {
          const r = removePerson(person.id);
          if (r) toast(`${person.name} supprimé·e`, { label: 'Annuler', onPress: () => restorePerson(r.person, r.index) });
        })}
      />
    </Sheet>
  );
}
