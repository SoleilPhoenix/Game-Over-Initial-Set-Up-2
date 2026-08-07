/**
 * Game Over brand logo — renders the vector logo (assets/brand/logo.svg) via
 * react-native-svg. Colors are already the design-system gold #C6A75E on
 * navy #0D1B2A. The SVG has a navy background tile, so it sits seamlessly on
 * navy surfaces. Pass `mark` size; width/height default to a square.
 */
import React from 'react';
import { SvgXml } from 'react-native-svg';
import { LOGO_SVG } from './logoSvg';

interface LogoProps {
  size?: number;
  width?: number;
  height?: number;
  testID?: string;
}

export function Logo({ size = 140, width, height, testID }: LogoProps) {
  return (
    <SvgXml
      xml={LOGO_SVG}
      width={width ?? size}
      height={height ?? size}
      testID={testID}
    />
  );
}

export default Logo;
