import { GuidedPracticeIntro } from '@/components/guided-practice/GuidedPracticeIntro';
import { NINETY_SECOND_RESET } from '@/lib/guided-practices';

export default function ResetIntroScreen() {
  return <GuidedPracticeIntro practice={NINETY_SECOND_RESET} />;
}
