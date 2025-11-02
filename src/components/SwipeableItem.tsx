import { ReactNode, useRef, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  onCheck?: () => void;
  isChecked?: boolean;
}

export const SwipeableItem = ({ children, onDelete, onCheck, isChecked }: SwipeableItemProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    if (diff < 0 && diff > -120) {
      setSwipeX(diff);
    } else if (diff > 0 && diff < 120 && onCheck) {
      setSwipeX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (swipeX < -80) {
      if ('vibrate' in navigator) navigator.vibrate(50);
      onDelete();
    } else if (swipeX > 80 && onCheck) {
      if ('vibrate' in navigator) navigator.vibrate(50);
      onCheck();
    }
    
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center justify-between">
        {onCheck && (
          <div 
            className="h-full flex items-center justify-center bg-success text-success-foreground px-6"
            style={{ width: Math.max(0, swipeX) }}
          >
            <Check className="w-6 h-6" />
          </div>
        )}
        <div 
          className="h-full flex items-center justify-center bg-destructive text-destructive-foreground px-6 ml-auto"
          style={{ width: Math.max(0, -swipeX) }}
        >
          <Trash2 className="w-6 h-6" />
        </div>
      </div>
      
      {/* Main content */}
      <div
        ref={itemRef}
        className="relative bg-card transition-transform touch-pan-y"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};