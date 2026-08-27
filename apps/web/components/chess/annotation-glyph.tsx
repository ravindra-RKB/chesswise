import { cn } from '@/lib/utils';

type AnnotationType = '!!' | '!' | '!?' | '?!' | '?' | '??';

interface AnnotationGlyphProps {
  type: AnnotationType;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

const annotationConfig: Record<AnnotationType, { label: string; classes: string }> = {
  '!!': {
    label: 'Brilliant',
    classes: 'text-gold bg-gold/10 border-gold/30',
  },
  '!': {
    label: 'Good',
    classes: 'text-good bg-good/10 border-good/30',
  },
  '!?': {
    label: 'Interesting',
    classes: 'text-gold/80 bg-gold/5 border-gold/20',
  },
  '?!': {
    label: 'Dubious',
    classes: 'text-muted-foreground bg-muted/50 border-muted-foreground/20',
  },
  '?': {
    label: 'Mistake',
    classes: 'text-blunder/80 bg-blunder/10 border-blunder/20',
  },
  '??': {
    label: 'Blunder',
    classes: 'text-blunder bg-blunder/15 border-blunder/30',
  },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-lg px-3 py-1.5 font-bold',
};

export function AnnotationGlyph({
  type,
  size = 'md',
  animate = false,
  className,
}: AnnotationGlyphProps) {
  const config = annotationConfig[type];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border font-mono font-semibold',
        config.classes,
        sizeClasses[size],
        animate && 'animate-glyph-pop',
        className,
      )}
      title={config.label}
      aria-label={`${config.label} move`}
    >
      {type}
    </span>
  );
}
