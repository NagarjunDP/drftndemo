import React from 'react';
import { ProductDetailSkeleton } from '@/components/Skeletons';

export default function ProductDetailLoading() {
  return (
    <div className="py-8 md:py-12 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
      <ProductDetailSkeleton />
    </div>
  );
}
