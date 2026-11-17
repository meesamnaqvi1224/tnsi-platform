import { GuidedPracticeIntro } from '@/components/guided-practice/GuidedPracticeIntro';
import { THE_EMPTY_CHAIR } from '@/lib/guided-practices';

export default function ChairIntroScreen() {
  return <GuidedPracticeIntro practice={THE_EMPTY_CHAIR} />;
}
