import React from 'react';
import { GlassModal, type GlassModalProps } from './GlassModal';

export const GlassSheet: React.FC<Omit<GlassModalProps, 'mode'>> = (props) => (
  <GlassModal {...props} mode="auto" />
);
