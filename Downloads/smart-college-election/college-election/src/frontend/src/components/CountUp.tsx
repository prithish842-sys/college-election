import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { memo, useEffect } from "react";

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  ariaHidden?: boolean;
}

const voteFormatter = new Intl.NumberFormat("en-IN");

export const CountUp = memo(function CountUp({
  value,
  duration = 0.7,
  className,
  ariaHidden,
}: CountUpProps) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) =>
    voteFormatter.format(Math.round(latest)),
  );

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: "easeOut",
    });

    return () => {
      controls.stop();
    };
  }, [count, duration, value]);

  return (
    <motion.span aria-hidden={ariaHidden} className={className}>
      {rounded}
    </motion.span>
  );
});
