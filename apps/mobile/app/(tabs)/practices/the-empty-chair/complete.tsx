import { GuidedPracticeComplete } from '@/components/guided-practice/GuidedPracticeComplete';
import { THE_EMPTY_CHAIR } from '@/lib/guided-practices';

export default function ChairCompleteScreen() {
  return <GuidedPracticeComplete practice={THE_EMPTY_CHAIR} />;
}
