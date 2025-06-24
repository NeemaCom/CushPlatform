import React from 'react';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { TestimonialsSection } from './TestimonialsSection';
import { MentorsSection } from './MentorsSection';
import { CommunityPreview } from './CommunityPreview';

export function NewHomepage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <MentorsSection />
      <CommunityPreview />
    </div>
  );
}