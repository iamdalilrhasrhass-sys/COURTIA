import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * ArkAuroraOrb — bulle de savon photographique transparente
 * Petites bulles en orbite autour, centre vide, pas de texte ARK
 */
export default function ArkAuroraOrb() {
  const bubbleRef = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 90, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 90, damping: 20 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);

  const handleMouseMove = (event) => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, x)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, y)));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={bubbleRef}
      className="soap-bubble-scene"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bulle principale transparente */}
      <motion.div
        className="soap-bubble"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          scale: [1, 1.012, 0.996, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="soap-bubble-ring" />
        <div className="soap-bubble-film" />
        <div className="soap-bubble-reflection-main" />
        <div className="soap-bubble-reflection-soft" />
        {/* PAS de texte ARK — bulle décorative pure */}
      </motion.div>

      {/* Petites bulles en orbite autour */}
      <span className="orbit-bubble orbit-bubble-one" />
      <span className="orbit-bubble orbit-bubble-two" />
      <span className="orbit-bubble orbit-bubble-three" />
      <span className="orbit-bubble orbit-bubble-four" />
      <span className="orbit-bubble orbit-bubble-five" />
    </div>
  );
}
