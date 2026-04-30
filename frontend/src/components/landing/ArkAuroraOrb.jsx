import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function ArkAuroraOrb() {
  const bubbleRef = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 90, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 90, damping: 20 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
  const shiftX = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
  const shiftY = useTransform(smoothY, [-0.5, 0.5], [-8, 8]);

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
      <motion.div
        className="soap-bubble-shadow"
        style={{
          x: shiftX,
          y: shiftY,
        }}
      />

      <motion.div
        className="soap-bubble"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          scale: [1, 1.018, 0.996, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="soap-bubble-iridescent-ring" />
        <div className="soap-bubble-inner-milk" />
        <div className="soap-bubble-liquid-colors" />
        <div className="soap-bubble-glass-border" />

        <motion.div
          className="soap-bubble-top-bubbles"
          animate={{
            y: [0, -5, 2, 0],
            x: [0, 3, -2, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="mini-bubble mini-bubble-one" />
          <span className="mini-bubble mini-bubble-two" />
          <span className="mini-bubble mini-bubble-three" />
          <span className="mini-bubble mini-bubble-four" />
          <span className="mini-bubble mini-bubble-five" />
          <span className="mini-bubble mini-bubble-six" />
        </motion.div>

        <div className="soap-bubble-big-reflection" />
        <div className="soap-bubble-soft-reflection" />
        <div className="soap-bubble-bottom-glow" />
        <div className="soap-bubble-chromatic-edge" />
        <div className="soap-bubble-scan" />

        <div className="soap-bubble-center">
          <div className="soap-bubble-center-blur" />
          <div className="soap-bubble-label">
            <span>ARK</span>
            <small>COURTIA AI</small>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="soap-bubble-orbit soap-bubble-orbit-one"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="soap-bubble-orbit soap-bubble-orbit-two"
        animate={{ rotate: -360 }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      />

      <div className="soap-bubble-floating-card soap-card-one">
        <strong>Morning Brief</strong>
        <span>Actions prioritaires</span>
      </div>

      <div className="soap-bubble-floating-card soap-card-two">
        <strong>Portefeuille vivant</strong>
        <span>Clients à suivre</span>
      </div>
    </div>
  );
}
