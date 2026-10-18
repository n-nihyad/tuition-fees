import { TuitionSlip } from '../../../shared/components/brand/TuitionSlip'
import { PortalIcon } from '../../../shared/components/brand/PortalIcon'
import { Card, Col, Empty, Row, Typography } from 'antd'
import PaymentStatusTag from '../../../shared/components/feedback/PaymentStatusTag'
import { Link } from 'react-router'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Payment } from '../../../shared/types/models'
import { useLocale } from '../../../shared/providers/useLocale'
import { dateTime, money } from '../../../shared/utils/formatters'

type Props = { payments: Payment[]; statusCounts?: Partial<Record<Payment['status'], number>> }

function AnimatedCount({ value }: { value: number }) {
  const element = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const node = element.current
    if (!node) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const stop = () => { cancelAnimationFrame(frame); node.textContent = String(value) }
    if (motion.matches || !('IntersectionObserver' in window)) { stop(); return }
    let start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 600)
      node.textContent = String(Math.round(value * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        start = performance.now()
        frame = requestAnimationFrame(tick)
        observer.disconnect()
      }
    })
    observer.observe(node)
    motion.addEventListener('change', stop)
    return () => { observer.disconnect(); cancelAnimationFrame(frame); motion.removeEventListener('change', stop) }
  }, [value])
  return <><span className="sr-only">{value}</span><span ref={element} aria-hidden="true">{value}</span></>
}

export default function DashboardOverview({ payments, statusCounts }: Props) {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const container = root.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!container || motion.matches || !('IntersectionObserver' in window)) return
    const elements = [...container.querySelectorAll<HTMLElement>('[data-scroll-reveal]')]
    const reveal = (element: HTMLElement) => {
      element.dataset.revealState = 'visible'
      observer.unobserve(element)
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target as HTMLElement) })
    }, { threshold: .1, rootMargin: '0px 0px -24px 0px' })
    elements.forEach((element) => {
      if (element.dataset.revealState === 'visible') return
      element.dataset.revealState = 'waiting'
      observer.observe(element)
    })
    const showAll = () => elements.forEach(reveal)
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return
      const element = event.target.closest<HTMLElement>('[data-scroll-reveal]')
      if (element) reveal(element)
    }
    motion.addEventListener('change', showAll)
    container.addEventListener('focusin', onFocus)
    return () => {
      showAll()
      observer.disconnect()
      motion.removeEventListener('change', showAll)
      container.removeEventListener('focusin', onFocus)
    }
  }, [payments])
  const { locale, t } = useLocale()
  const successful = statusCounts?.succeeded ?? payments.filter((payment) => payment.status === 'succeeded').length
  const pending = statusCounts?.pending_otp ?? payments.filter((payment) => payment.status === 'pending_otp').length
  const total = statusCounts ? Object.values(statusCounts).reduce((sum, value) => sum + (value ?? 0), 0) : payments.length
  return <div ref={root} className="dashboard-scroll-reveal">
    <Row gutter={[24, 24]} className="mb-6">
      <Col xs={24} sm={12} data-scroll-reveal>
        <Card className="h-full edge-overview-intro rose-hero">
          <TuitionSlip className="dashboard-tuition-slip" />
          <div className="edge-overview-content">
            <div className="rose-hero-copy"><span className="rose-kicker">{t('HỌC PHÍ SỐ', 'TUITION PORTAL')}</span>
              <Typography.Title level={3}>{t('Học phí,', 'Tuition,')}<br /><em>{t('nhẹ một nhịp.', 'a little lighter.')}</em></Typography.Title>
              <Typography.Paragraph type="secondary">{t('Chọn khoản phí. Xác thực. Xong.', 'Choose. Verify. Done.')}</Typography.Paragraph></div>
            <Link to="/payment" className="edge-primary-link">{t('Thanh toán', 'Pay tuition')} <PortalIcon name="arrow" /></Link>
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} data-scroll-reveal style={{ '--reveal-delay': '70ms' } as React.CSSProperties}>
        <Card className="h-full rose-activity">
          <div className="edge-overview-content">
            <Typography.Title level={4}>{t('Giao dịch', 'Payments')}</Typography.Title>
            <div className="edge-stats">
              {[
                { value: total, label: t('Tổng số', 'Total'), tone: '' },
                { value: successful, label: t('Thành công', 'Successful'), tone: '' },
                { value: pending, label: t('Chờ xác thực', 'Awaiting confirmation'), tone: 'edge-pending' },
              ].map((item) => <div className={`rose-stat ${item.tone}`} key={item.label}><span>{item.label}</span><strong><AnimatedCount value={item.value} /></strong></div>)}
            </div>
            <div className="edge-stat-footer"><small>{statusCounts ? t('Toàn bộ lịch sử của bạn', 'Across your full history') : t('Trong 20 giao dịch mới nhất', 'Across the 20 latest payments')}</small><Link to={pending ? '/history?status=pending_otp' : '/history'}>{pending ? t('Xem giao dịch chờ', 'View pending payments') : t('Xem lịch sử', 'View history')} <PortalIcon name="arrow" /></Link></div>
          </div>
        </Card>
      </Col>
    </Row>
    <Card className="edge-recent" title={<span className="scroll-reveal-heading" data-scroll-reveal>{t('Giao dịch gần đây', 'Recent payments')}</span>}
      extra={<Link to="/history">{t('Xem tất cả', 'View all')} <PortalIcon name="arrow" /></Link>}>
      {payments.length === 0 ? <Empty image={<PortalIcon name="history" className="empty-history-icon" />} description={t('Chưa có giao dịch', 'No payments yet')} />
        : payments.slice(0, 3).map((payment, index) => <div className="edge-recent-row" key={payment.id} data-scroll-reveal style={{ '--reveal-delay': `${index * 70}ms` } as React.CSSProperties}>
          <div className="edge-recent-name"><Link className="recent-payment-link" to={`/history?payment=${payment.id}`}><strong>{payment.feeName}</strong><span className="sr-only"> · {t('Xem chi tiết', 'View details')}</span></Link><span>{payment.studentId} · {dateTime(payment.createdAt, locale)}</span></div>
          <div className="edge-recent-value"><strong>{money(payment.amount, locale)}</strong><PaymentStatusTag status={payment.status} /></div>
        </div>)}
    </Card>
  </div>
}
