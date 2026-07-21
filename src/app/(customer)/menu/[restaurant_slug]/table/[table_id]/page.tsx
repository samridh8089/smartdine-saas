import CustomerMenu from '@/components/customer/CustomerMenu';

interface PageProps {
  params: Promise<{
    restaurant_slug: string;
    table_id: string;
  }>;
}

export default async function CustomerTableMenuPage({ params }: PageProps) {
  const resolvedParams = await params;
  return (
    <CustomerMenu 
      restaurantSlug={resolvedParams.restaurant_slug} 
      tableId={resolvedParams.table_id} 
    />
  );
}
