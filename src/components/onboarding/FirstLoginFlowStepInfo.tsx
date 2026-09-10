import { CardDescription, CardTitle } from '@/components/ui/card';

export type FirstLoginFlowStepInfoProps = {
  title: string;
  description: string;
};

export function FirstLoginFlowStepInfo({
  title,
  description,
}: FirstLoginFlowStepInfoProps) {
  return (
    <>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </>
  );
}
