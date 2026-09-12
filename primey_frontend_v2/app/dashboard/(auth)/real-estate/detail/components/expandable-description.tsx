"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ExpandableDescriptionProps = {
  text: string;
  collapsedLines?: number;
};

export function ExpandableDescription({ text, collapsedLines = 7 }: ExpandableDescriptionProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (!textRef.current) return;
      setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);

    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, isExpanded]);

  return (
    <div className="space-y-2">
      <p
        ref={textRef}
        className="text-muted-foreground leading-7"
        style={
          isExpanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: collapsedLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }
        }>
        {text}
      </p>
      {isOverflowing && (
        <Button
          variant="link"
          size="sm"
          className="px-0"
          onClick={() => setIsExpanded((prev) => !prev)}>
          {isExpanded ? "Read less" : "Read more"}
        </Button>
      )}
    </div>
  );
}
