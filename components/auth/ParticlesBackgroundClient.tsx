'use client';

import dynamic from 'next/dynamic';

const ParticlesBackground = dynamic(() => import('@/components/auth/ParticlesBackground'), {
  ssr: false,
});

type Props = {
  density?: number;
  zIndex?: number;
};

export default function ParticlesBackgroundClient({ density, zIndex }: Props) {
  return <ParticlesBackground density={density} zIndex={zIndex} />;
}
