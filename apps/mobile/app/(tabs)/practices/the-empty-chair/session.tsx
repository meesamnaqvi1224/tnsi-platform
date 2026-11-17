import { GuidedPracticeSession } from '@/components/guided-practice/GuidedPracticeSession';
import { THE_EMPTY_CHAIR } from '@/lib/guided-practices';

export default function ChairSessionScreen() {
  return <GuidedPracticeSession practice={THE_EMPTY_CHAIR} />;
}
