import { PortalIcon } from '../../../shared/components/brand/PortalIcon'
import { CheckCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Col, Descriptions, Input, Result, Row, Select, Steps, Tag, Typography } from 'antd'
import type { FormEventHandler } from 'react'
import { Link } from 'react-router'
import type { Fee, Payment, Profile, Wallet } from '../../../shared/types/models'
import { useLocale } from '../../../shared/providers/useLocale'
import { dateTime, money } from '../../../shared/utils/formatters'

type Props = {
  profile: Profile
  wallet: Wallet | null
  fee: Fee | null
  selectedFee: Fee | null
  studentId: string
  termsAccepted: boolean
  pendingPayment: Payment | null
  lastPayment: Payment | null
  otp: string
  busy: boolean
  expired: boolean
  canPay: boolean
  lookupBusy: boolean
  otpError: boolean
  secondsRemaining: number
  otpAttemptsRemaining?: number
  onStudentIdChange: (value: string) => void
  onFeeSelect: (value: string) => void
  onTermsAcceptedChange: (value: boolean) => void
  onOtpChange: (value: string) => void
  onLookupFee: FormEventHandler<HTMLFormElement>
  onStartPayment: () => void
  onConfirmPayment: FormEventHandler<HTMLFormElement>
  onDeferPayment: () => void
}

export default function PaymentForm(props: Props) {
  const { profile, wallet, fee, selectedFee, pendingPayment, lastPayment, busy } = props
  const { locale, t } = useLocale()
  return <Row gutter={[20, 20]}>
    <Col xs={24} lg={16}>
      <Card className="rose-payment rounded-2xl border-brand-line shadow-sm" title={t('Thanh toán học phí', 'Tuition payment')}>
        <div className="edge-payer">
          <div className="payment-payer-identity"><strong>{profile.fullName}</strong><span className="payment-payer-email">{profile.email}</span></div>
          <div className="edge-wallet rose-balance"><span>{t('Số dư khả dụng', 'Available balance')}</span><strong>{wallet ? money(wallet.availableBalance, locale) : '—'}</strong></div>
        </div>
        <details className="edge-details"><summary>{t('Thông tin tài khoản', 'Account details')}</summary>
          <Descriptions size="small" column={1} items={[
            { key: 'phone', label: t('Điện thoại', 'Phone'), children: profile.phone },
            { key: 'email', label: t('Gửi đến', 'Sent to'), children: profile.email },
          ]} />
        </details>
        {!pendingPayment && <>
        <form className="mt-6 grid gap-2" onSubmit={props.onLookupFee}>
          <label htmlFor="student-id" className="text-sm font-semibold">{t('Mã số sinh viên', 'Student ID')}</label>
          <div className="flex gap-2">
            <Input id="student-id" value={props.studentId} maxLength={32} required size="large"
              disabled={busy || Boolean(pendingPayment)} prefix={<PortalIcon name="search" />}
              placeholder={t('Nhập MSSV', 'Enter student ID')}
              onChange={(event) => props.onStudentIdChange(event.target.value)} />
            <Button type="primary" htmlType="submit" size="large" loading={busy} aria-label={t('Tra cứu', 'Look up')} aria-busy={props.lookupBusy}
              disabled={busy || Boolean(pendingPayment) || !props.studentId.trim()}>{props.lookupBusy ? t('Đang tìm…', 'Searching…') : t('Tra cứu', 'Look up')}</Button>
          </div>
        </form>
        {fee && <div key={fee.studentId} className="edge-fee-panel interactive-reveal">
          <div className="fee-student-info"><Typography.Text strong>{fee.studentName}</Typography.Text><Typography.Text type="secondary">{fee.studentId}</Typography.Text></div>
          <label htmlFor="tuition-fee" className="text-sm font-semibold">{t('Khoản học phí', 'Tuition fee')}</label>
          <Select id="tuition-fee" size="large" value={selectedFee?.tuitionFeeId ?? undefined}
            virtual={false}
            classNames={{ root: 'fee-select-root', content: 'fee-select-content', itemContent: 'fee-select-text', popup: { root: 'fee-select-popup' } }}
            labelRender={({ value }) => <span className="fee-select-text">{fee.fees.find((item) => item.id === value)?.name ?? ''}</span>}
            optionRender={(option) => <div className="fee-select-option"><strong>{option.data.name}</strong><span>{money(option.data.amount, locale)} · {option.data.status === 'paid' ? t('Đã thanh toán', 'Paid') : t('Chưa thanh toán', 'Unpaid')}</span></div>}
            disabled={busy || Boolean(pendingPayment)} placeholder={t('Chọn học kỳ / khoản thu', 'Choose a semester / fee')}
            onChange={props.onFeeSelect} className="w-full" options={fee.fees.map((item) => ({
              value: item.id,
              name: item.name, amount: item.amount, status: item.status,
              label: `${item.name} · ${money(item.amount, locale)} · ${item.status === 'paid' ? t('Đã thanh toán', 'Paid') : t('Chưa thanh toán', 'Unpaid')}`,
            }))} />
          {selectedFee && <div key={selectedFee.tuitionFeeId} className="fee-selection interactive-reveal flex flex-wrap items-center justify-between gap-2">
            <span className="fee-selection-name"><CheckCircleOutlined />{selectedFee.name}</span>
            <Typography.Title level={3} className="fee-selection-amount !m-0 !text-brand-green-strong">{money(selectedFee.amount, locale)}</Typography.Title>
            <Tag color={selectedFee.isPaid ? 'success' : 'orange'}>{selectedFee.isPaid ? t('Đã thanh toán', 'Paid') : t('Chưa thanh toán', 'Unpaid')}</Tag>
          </div>}
          {selectedFee && !selectedFee.isPaid && wallet && Number(wallet.availableBalance) < Number(selectedFee.amount) &&
            <Alert showIcon type="warning" message={t('Số dư không đủ để trả khoản phí này.', 'Insufficient balance for this fee.')} />}
          {!selectedFee && <Typography.Text type="secondary">{t('Chọn một khoản để tiếp tục.', 'Select a fee to continue.')}</Typography.Text>}
        </div>}
        {!pendingPayment && <div className="mt-5 grid gap-3">
          <Checkbox checked={props.termsAccepted} disabled={busy || !selectedFee || selectedFee.isPaid}
            onChange={(event) => props.onTermsAcceptedChange(event.target.checked)}>
            {t('Tôi đồng ý điều khoản thanh toán.', 'I accept the payment terms.')}
          </Checkbox>
          <details className="edge-details edge-terms">
            <summary>{t('Xem điều khoản', 'View terms')}</summary>
            <p>{t('Thanh toán toàn bộ khoản phí đã chọn từ ví sau khi xác thực OTP thành công.', 'Pay the selected fee in full from your wallet after successful OTP verification.')}</p>
          </details>
          <Button type="primary" block size="large" loading={busy} aria-label={t('Tiếp tục', 'Continue')} aria-busy={busy} disabled={!props.canPay || busy} onClick={props.onStartPayment}>
            {t('Tiếp tục', 'Continue')}
          </Button>
        </div>}
        </>}
        {pendingPayment && <form key={pendingPayment.id} onSubmit={props.onConfirmPayment} className="edge-otp interactive-reveal">
          <Typography.Title level={5} className="!m-0">{t('Xác thực thanh toán', 'Verify payment')}</Typography.Title>
          <strong className="edge-payment-amount">{money(pendingPayment.amount, locale)}</strong>
          <Typography.Text type="secondary">{pendingPayment.feeName} · {pendingPayment.studentId}</Typography.Text>
          <Typography.Text type="secondary">{t('Gửi đến', 'Sent to')}: {profile.email}</Typography.Text>
          <Alert showIcon type={props.expired || props.otpAttemptsRemaining === 0 ? 'warning' : 'info'} message={props.expired
            ? t('OTP đã hết hạn. Kiểm tra trạng thái giao dịch trong lịch sử.', 'OTP expired. Check the payment status in history.')
            : props.otpAttemptsRemaining === 0 ? t('Đã hết lượt nhập. Chờ giao dịch hết hạn rồi tạo lại.', 'No submissions remain. Wait for expiry before starting again.')
              : <span className="otp-countdown">{t('Thời gian còn lại', 'Time remaining')} <strong>{Math.floor(props.secondsRemaining / 60)}:{String(props.secondsRemaining % 60).padStart(2, '0')}</strong></span>} />
          <Typography.Text type="secondary">{props.otpAttemptsRemaining === undefined
            ? t('Tối đa 5 lần gửi mã cho mỗi giao dịch.', 'At most 5 code submissions per payment.')
            : t(`Còn ${props.otpAttemptsRemaining} lần gửi mã.`, `${props.otpAttemptsRemaining} code submissions remaining.`)}</Typography.Text>
          <span id="otp-code-label">{t('Mã OTP gồm 6 chữ số', '6-digit OTP')}</span>
          <div className={props.otpError ? 'otp-feedback otp-feedback-error' : 'otp-feedback'} data-ready={!props.otpError && props.otp.length === 6 && !props.expired}>
          <Input.OTP aria-labelledby="otp-code-label" aria-describedby={props.otpError ? 'otp-feedback-message' : undefined} length={6} type="tel" autoComplete="one-time-code" size="large"
            status={props.otpError ? 'error' : undefined}
            disabled={busy || props.expired || props.otpAttemptsRemaining === 0} value={props.otp} formatter={(value) => value.replace(/\D/g, '')}
            onInput={(values) => props.onOtpChange(values.join('').replace(/\D/g, '').slice(0, 6))} />
          {props.otpError && <Typography.Text id="otp-feedback-message" type="danger" role="alert">{t('Mã không hợp lệ hoặc đã hết hạn. Kiểm tra lại mã.', 'The code is invalid or expired. Please check it.')}</Typography.Text>}
          </div>
          <Button type="primary" htmlType="submit" block loading={busy} aria-label={t('Xác nhận thanh toán', 'Confirm payment')} aria-busy={busy} disabled={busy || props.expired || props.otpAttemptsRemaining === 0 || props.otp.length !== 6}>
            {t('Xác nhận thanh toán', 'Confirm payment')}
          </Button>
          <Button disabled={busy} onClick={props.onDeferPayment}>
            {props.expired ? t('Chọn lại khoản phí', 'Select a fee again') : t('Để sau, thanh toán khoản khác', 'Pay another fee for now')}
          </Button>
          <details className="edge-details"><summary>{t('Về giao dịch đang chờ', 'About pending payments')}</summary><p>{t('Giao dịch giữ thời hạn OTP ban đầu. Quay lại từ lịch sử trước khi mã hết hạn; mỗi khoản phí chỉ có một giao dịch chờ.', 'The original OTP deadline is unchanged. Resume from history before expiry; each fee allows one pending payment.')}</p></details>
          <Link to="/history">{t('Kiểm tra lịch sử giao dịch', 'Check payment history')}</Link>
        </form>}
        {lastPayment?.status === 'succeeded' && <div key={lastPayment.id} className="edge-receipt interactive-receipt mt-5">
          <Result className="portal-payment-result" status="success" title={t('Thanh toán thành công', 'Payment successful')}
            icon={<svg className="receipt-check" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" /><path d="m19 32 9 9 18-19" /></svg>}
            subTitle={lastPayment.feeName} extra={<Typography.Title level={3}>{money(lastPayment.amount, locale)}</Typography.Title>} />
          <Descriptions column={1} size="small" title={t('Biên nhận thanh toán', 'Payment receipt')} items={[
            { key: 'id', label: t('Mã giao dịch', 'Payment ID'), children: <span className="break-all">{lastPayment.id}</span> },
            { key: 'fee', label: t('Khoản phí', 'Fee'), children: lastPayment.feeName },
            { key: 'before', label: t('Số dư trước thanh toán', 'Balance before payment'), children: lastPayment.balanceBefore === null ? '—' : money(lastPayment.balanceBefore, locale) },
            { key: 'done', label: t('Hoàn tất lúc', 'Completed at'), children: lastPayment.completedAt ? dateTime(lastPayment.completedAt, locale) : '—' },
          ]} />
          <Link className="receipt-history-link" to="/history">{t('Xem lịch sử giao dịch', 'View payment history')} <PortalIcon name="arrow" /></Link>
        </div>}
      </Card>
    </Col>
    <Col xs={24} lg={8}>
      <Card className="edge-guide rose-guide rounded-2xl" title={t('Các bước thanh toán', 'Payment steps')}>
        <Steps orientation="vertical" current={lastPayment?.status === 'succeeded' ? 3 : pendingPayment ? 2 : selectedFee ? 1 : 0} items={[
          { title: t('Tra cứu MSSV', 'Look up student') },
          { title: t('Chọn khoản phí', 'Select fee') },
          { title: t('Xác thực OTP', 'Verify OTP') },
        ]} />
        <Typography.Paragraph type="secondary" className="!mt-5 !mb-0">{t('OTP có hiệu lực tối đa 5 phút, tối đa 5 lần nhập. Không chia sẻ mã.', 'OTP is valid for up to 5 minutes, with at most 5 submissions. Keep your code private.')}</Typography.Paragraph>
      </Card>
    </Col>
  </Row>
}
