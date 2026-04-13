import SectionLinksPage from '@/components/section-links-page'

export default function PaymentPage() {
  return (
    <SectionLinksPage
      title="Payment"
      links={[
        { label: 'Entry', href: '/procurement/payment/entry' },
        { label: 'Update', href: '/procurement/payment/update' },
        { label: 'View', href: '/procurement/payment/view' },
      ]}
    />
  )
}
