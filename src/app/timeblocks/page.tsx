import { Suspense } from "react";
import { TimeblocksBoard } from "@/components/timeblocks/TimeblocksBoard";

export const metadata = {
  title: "Time Blocks",
};

export default function TimeblocksPage() {
  return (
    <Suspense fallback={null}>
      <TimeblocksBoard />
    </Suspense>
  );
}
