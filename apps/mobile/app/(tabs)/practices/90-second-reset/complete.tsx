import { GuidedPracticeComplete } from '@/components/guided-practice/GuidedPracticeComplete';
import { NINETY_SECOND_RESET } from '@/lib/guided-practices';

export default function ResetCompleteScreen() {
  return <GuidedPracticeComplete practice={NINETY_SECOND_RESET} />;
}
