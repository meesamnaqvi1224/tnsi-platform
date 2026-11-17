import { GuidedPracticeSession } from '@/components/guided-practice/GuidedPracticeSession';
import { NINETY_SECOND_RESET } from '@/lib/guided-practices';

export default function ResetSessionScreen() {
  return <GuidedPracticeSession practice={NINETY_SECOND_RESET} />;
}
