'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [swaggerSpec, setSwaggerSpec] = useState(null);

  useEffect(() => {
    fetch('/api/swagger')
      .then(res => res.json())
      .then(data => setSwaggerSpec(data));
  }, []);

  if (!swaggerSpec) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading API Documentation...</div>
      </div>
    );
  }

  return (
    <div>
      <SwaggerUI 
        spec={swaggerSpec}
        docExpansion="list"
        defaultModelExpandDepth={2}
        defaultModelsExpandDepth={1}
        tryItOutEnabled={true}
        displayRequestDuration={true}
        filter={true}
      />
    </div>
  );
}