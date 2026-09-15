type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <main>
      <h1>Order {id}</h1>
      <p>Order detail, risk score, and workflow status.</p>
    </main>
  );
}
