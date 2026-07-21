import CustomerMenu from '@/components/customer/CustomerMenu';

interface PageProps {
  params: Promise<{
    restaurant_slug: string;
  }>;
}

export default async function CustomerMenuPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <CustomerMenu restaurantSlug={resolvedParams.restaurant_slug} />;
}
