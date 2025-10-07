export type ExtractedProduct = {
  url: string;
  title: string;
  bullets: string[];
  description: string;
  images: string[]; // full-size URLs
};

export type OptimizedListing = {
  ebayTitle: string; // ≤ 80 chars
  ebayHtmlDescription: string; // sanitized HTML
  keywords: string[];
};

export type Task = {
  url: string;
  id: string; // uuid
};

export type PipelineResult = {
  extracted: ExtractedProduct;
  optimized: OptimizedListing;
};
