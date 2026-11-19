import React from 'react';
import { Helmet } from 'react-helmet-async';

// TODO: Confirm fitplus-kappa.vercel.app as the production domain or update to the custom domain when configured.
const SITE_ORIGIN = 'https://fitplus-kappa.vercel.app';
const SITE_NAME = 'FitPlus';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/pwa-512x512.png`;

interface SEOHelmetProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export const SEOHelmet: React.FC<SEOHelmetProps> = ({
  title,
  description,
  path,
  noindex,
  ogType = 'website',
  jsonLd,
}) => {
  const canonicalUrl = `${SITE_ORIGIN}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export { SITE_ORIGIN, SITE_NAME };
