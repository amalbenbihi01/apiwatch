import { getPublicStatusPageData } from '@/services/status-page-service';
import PublicStatusClient from './PublicStatusClient';

export async function generateMetadata({ params }) {
  try {
    const { slug } = await params;
    if (!slug) return { title: 'Statut des Services - APIWatch' };

    const data = await getPublicStatusPageData(slug);
    return {
      title: data?.title ? `${data.title} - Status` : `Statut des Services (${slug})`,
      description: data?.description || 'Consultez la santé en temps réel et la disponibilité de nos services.',
    };
  } catch (err) {
    return {
      title: 'Statut des Services - Introuvable',
      description: 'Page de statut indisponible ou introuvable.',
    };
  }
}

export default async function PublicStatusPage({ params }) {
  const { slug } = await params;
  return <PublicStatusClient slug={slug} />;
}
