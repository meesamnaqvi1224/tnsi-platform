'use client';

/**
 * Sanity Studio configuration for the embedded Studio at /studio.
 * The Studio is decoupled from the site render; editors publish here and
 * the site reads the same dataset.
 */
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { apiVersion, dataset, projectId, schemaTypes, structure } from '@tnsi/cms';

export default defineConfig({
  name: 'tnsi',
  title: 'The Nervous System Institute',
  basePath: '/studio',
  projectId: projectId || 'placeholder',
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
});
