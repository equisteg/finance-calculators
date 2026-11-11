import { router } from 'expo-router';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/ui';

const PLANNERS = [
  { href: '/debt', title: 'Debt payoff planner', subtitle: 'Avalanche or snowball: when each debt is cleared and the interest you save.', id: 'debt' },
  { href: '/goals', title: 'Goal planner', subtitle: 'The monthly saving each goal needs, funded in priority order from one budget.', id: 'goals' },
  { href: '/retirement', title: 'Retirement planner', subtitle: 'Will your money last? Projection and, with Pro, 1,000-run odds.', id: 'retirement' },
  { href: '/prepayment', title: 'Loan prepayment', subtitle: 'Part-payment: shorter loan or lower EMI, and the interest saved.', id: 'prepayment' },
] as const;

export default function PlanScreen() {
  return (
    <Screen title="Plan" intro="Plans built on your own numbers. Everything stays on this phone." disclaimer={false} ad={false} testID="screen-plan">
      {PLANNERS.map((x) => (
        <ListItem key={x.id} title={x.title} subtitle={x.subtitle} onPress={() => router.push(x.href)} testID={`planner-${x.id}`} />
      ))}
    </Screen>
  );
}
