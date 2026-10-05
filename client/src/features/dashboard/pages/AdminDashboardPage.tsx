import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BellOutlined,
  BookOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DownloadOutlined,
  LogoutOutlined,
  MenuOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Input, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLogout } from '../../auth/hooks/useLogout';

const { Text, Title } = Typography;

const monthlyCollection = [
  { month: 'T1', amount: 34 },
  { month: 'T2', amount: 48 },
  { month: 'T3', amount: 41 },
  { month: 'T4', amount: 62 },
  { month: 'T5', amount: 55 },
  { month: 'T6', amount: 73 },
  { month: 'T7', amount: 66 },
  { month: 'T8', amount: 88 },
  { month: 'T9', amount: 76 },
  { month: 'T10', amount: 96 },
  { month: 'T11', amount: 68 },
  { month: 'T12', amount: 82 },
];

const transactions = [
  { name: 'Nguyễn Minh Anh', detail: 'Học phí học kỳ I · Lớp 10A1', amount: '12.500.000đ', time: '09:42', status: 'Thành công', initials: 'MA', tone: 'bg-[#e5f6e8] text-[#4d9160]' },
  { name: 'Trần Gia Bảo', detail: 'Học phí học kỳ I · Lớp 11B2', amount: '8.000.000đ', time: '09:18', status: 'Thành công', initials: 'GB', tone: 'bg-[#fce8ef] text-[#c66c8b]' },
  { name: 'Lê Khánh Linh', detail: 'Phí hoạt động ngoại khóa · Lớp 9A3', amount: '1.250.000đ', time: '08:56', status: 'Đang xử lý', initials: 'KL', tone: 'bg-[#fff2db] text-[#b58a3b]' },
  { name: 'Phạm Đức Huy', detail: 'Học phí học kỳ I · Lớp 12A2', amount: '12.500.000đ', time: '08:31', status: 'Thành công', initials: 'DH', tone: 'bg-[#e9eafe] text-[#7373bb]' },
];

const navigationItems = [
  { label: 'Tổng quan', icon: <DashboardOutlined />, href: '#overview', active: true },
  { label: 'Giao dịch', icon: <CreditCardOutlined />, href: '#transactions', active: false },
  { label: 'Học sinh', icon: <TeamOutlined />, href: '#students', active: false },
  { label: 'Báo cáo', icon: <BookOutlined />, href: '#reports', active: false },
];

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { submitLogout } = useLogout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  async function handleLogout() {
    try {
      await submitLogout();
    } catch {
      messageApi.warning(
        'Đã đăng xuất khỏi thiết bị này, nhưng máy chủ chưa thu hồi được phiên.',
      );
    } finally {
      navigate('/');
    }
  }

  return (
    <>
    {contextHolder}
    <main id="overview" className="min-h-screen bg-[#f7f9f7] text-[#25382c]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-[#edf0ec] bg-white px-5 py-7 lg:flex">
        <a href="#overview" className="mb-10 flex items-center gap-3 px-2 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#ADEBB3] text-[#315e3d]">
            <WalletOutlined className="text-lg" />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight text-[#294331]">Học Phí Số</span>
            <span className="block text-[11px] font-medium tracking-wide text-[#93a096]">QUẢN LÝ TÀI CHÍNH</span>
          </span>
        </a>

        <Text className="mb-3 px-3 !text-[10px] !font-bold !uppercase !tracking-[0.17em] !text-[#a3ada5]">
          Không gian làm việc
        </Text>
        <nav aria-label="Điều hướng chính" className="space-y-1">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold no-underline transition-colors ${
                item.active
                  ? 'bg-[#eaf8ec] text-[#3f7b4b]'
                  : 'text-[#7d8a80] hover:bg-[#f5f8f5] hover:text-[#45694d]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {item.label === 'Giao dịch' && (
                <span className="ml-auto rounded-md bg-[#fce8ef] px-2 py-0.5 text-[10px] font-bold text-[#bf6d89]">
                  12
                </span>
              )}
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-[#f7faf7] p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6fa879] shadow-sm">
            <SettingOutlined />
          </div>
          <Text className="block !text-sm !font-semibold !text-[#43564a]">Cần trợ giúp?</Text>
          <Text className="mt-1 block !text-xs !leading-5 !text-[#929d94]">
            Đội ngũ hỗ trợ luôn sẵn sàng đồng hành cùng bạn.
          </Text>
          <a href="mailto:support@hocphiso.vn" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#53845c] no-underline">
            Liên hệ hỗ trợ <ArrowRightOutlined />
          </a>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-[#edf0ec] bg-white/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Mở điều hướng"
              icon={<MenuOutlined />}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="!flex !h-10 !w-10 items-center justify-center !rounded-xl !border-[#edf0ec] !text-[#637469] lg:!hidden"
            />
            <div>
              <Text className="block !text-[11px] !font-semibold !uppercase !tracking-[0.12em] !text-[#9aa59c]">
                {today}
              </Text>
              <Text className="block !text-sm !font-semibold !text-[#405246]">Tổng quan</Text>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <Input
              aria-label="Tìm kiếm"
              prefix={<SearchOutlined className="text-[#9aa69d]" />}
              placeholder="Tìm kiếm..."
              className="hidden !w-48 !rounded-xl !border-[#edf0ec] sm:flex md:!w-60"
            />
            <Button
              aria-label="Thông báo"
              icon={<BellOutlined />}
              className="!flex !h-10 !w-10 items-center justify-center !rounded-xl !border-[#edf0ec] !text-[#69796e]"
            />
            <span className="hidden h-8 w-px bg-[#edf0ec] sm:block" />
            <div className="flex items-center gap-2.5">
              <Avatar className="!bg-[#f9dce6] !font-semibold !text-[#a85d77]">AD</Avatar>
              <div className="hidden sm:block">
                <Text className="block !text-xs !font-bold !text-[#405246]">Quản trị viên</Text>
                <Text className="block !text-[11px] !text-[#9aa59c]">Quản lý hệ thống</Text>
              </div>
            </div>
            <Button
              aria-label="Đăng xuất"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="!flex !h-10 !w-10 items-center justify-center !rounded-xl !border-[#edf0ec] !text-[#718077]"
            />
          </div>
          {isMenuOpen && (
            <nav
              aria-label="Điều hướng di động"
              className="absolute left-0 right-0 top-full border-b border-[#edf0ec] bg-white p-3 shadow-lg lg:hidden"
            >
              {navigationItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold no-underline ${
                    item.active ? 'bg-[#eaf8ec] text-[#3f7b4b]' : 'text-[#7d8a80]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Title level={2} className="!mb-1 !text-[26px] !font-semibold !tracking-tight !text-[#283d2f]">
                Xin chào, Quản trị viên <span aria-hidden="true">👋</span>
              </Title>
              <Text className="!text-sm !text-[#87938a]">
                Đây là tình hình thu học phí của bạn hôm nay.
              </Text>
            </div>
            <Button
              icon={<DownloadOutlined />}
              className="!h-10 !rounded-xl !border-[#e7ece7] !bg-white !px-4 !text-sm !font-semibold !text-[#53675a] hover:!border-[#b7dfbd] hover:!text-[#477b50]"
            >
              Xuất báo cáo
            </Button>
          </section>

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số tổng quan">
            <article id="students" className="rounded-2xl border border-[#edf0ec] bg-white p-5 shadow-[0_3px_14px_-10px_rgba(30,60,40,0.25)]">
              <div className="mb-5 flex items-center justify-between">
                <Text className="!text-sm !font-medium !text-[#819087]">Tổng học phí đã thu</Text>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f8ea] text-[#6caf77]">
                  <WalletOutlined />
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <Text className="!text-[25px] !font-bold !tracking-tight !text-[#2d4434]">1,284,500,000đ</Text>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#65a975]">
                <ArrowUpOutlined /> 12,8%
                <span className="font-normal text-[#9aa59c]">so với tháng trước</span>
              </div>
            </article>

            <article className="rounded-2xl border border-[#edf0ec] bg-white p-5 shadow-[0_3px_14px_-10px_rgba(30,60,40,0.25)]">
              <div className="mb-5 flex items-center justify-between">
                <Text className="!text-sm !font-medium !text-[#819087]">Chờ thanh toán</Text>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff2df] text-[#d3a34f]">
                  <ClockCircleOutlined />
                </span>
              </div>
              <Text className="!text-[25px] !font-bold !tracking-tight !text-[#2d4434]">186.250.000đ</Text>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#d29846]">
                <ArrowDownOutlined /> 3,2%
                <span className="font-normal text-[#9aa59c]">so với tháng trước</span>
              </div>
            </article>

            <article className="rounded-2xl border border-[#edf0ec] bg-white p-5 shadow-[0_3px_14px_-10px_rgba(30,60,40,0.25)]">
              <div className="mb-5 flex items-center justify-between">
                <Text className="!text-sm !font-medium !text-[#819087]">Giao dịch tháng này</Text>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fcebf1] text-[#cf7894]">
                  <CreditCardOutlined />
                </span>
              </div>
              <Text className="!text-[25px] !font-bold !tracking-tight !text-[#2d4434]">2.486</Text>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#65a975]">
                <ArrowUpOutlined /> 8,4%
                <span className="font-normal text-[#9aa59c]">so với tháng trước</span>
              </div>
            </article>

            <article className="rounded-2xl border border-[#edf0ec] bg-white p-5 shadow-[0_3px_14px_-10px_rgba(30,60,40,0.25)]">
              <div className="mb-5 flex items-center justify-between">
                <Text className="!text-sm !font-medium !text-[#819087]">Học sinh</Text>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff0fd] text-[#8082c4]">
                  <TeamOutlined />
                </span>
              </div>
              <Text className="!text-[25px] !font-bold !tracking-tight !text-[#2d4434]">3.240</Text>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#65a975]">
                <ArrowUpOutlined /> 24
                <span className="font-normal text-[#9aa59c]">học sinh mới tháng này</span>
              </div>
            </article>
          </section>

          <section className="mb-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <article id="reports" className="rounded-2xl border border-[#edf0ec] bg-white p-5 sm:p-6">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text className="block !text-base !font-bold !text-[#354a3b]">Tổng quan thu học phí</Text>
                  <Text className="mt-1 block !text-xs !text-[#99a49b]">Tình hình thu trong năm 2026</Text>
                </div>
                <Tag className="!m-0 !rounded-lg !border-0 !bg-[#f4f7f4] !px-3 !py-1 !text-xs !font-semibold !text-[#748278]">
                  Năm nay
                </Tag>
              </div>
              <div className="flex h-[210px]">
                <div className="flex flex-col justify-between pb-6 pr-3 text-right text-[10px] text-[#a3ada5]">
                  <span>150tr</span>
                  <span>100tr</span>
                  <span>50tr</span>
                  <span>0</span>
                </div>
                <div className="relative flex flex-1 items-end justify-between gap-1 border-b border-l border-[#edf0ec] px-2 sm:gap-2 sm:px-4">
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[calc(100%-24px)] flex-col justify-between">
                    <span className="border-t border-dashed border-[#eff2ef]" />
                    <span className="border-t border-dashed border-[#eff2ef]" />
                    <span className="border-t border-dashed border-[#eff2ef]" />
                    <span className="border-t border-dashed border-[#eff2ef]" />
                  </div>
                  {monthlyCollection.map(({ month, amount }) => (
                    <div key={month} className="relative z-[1] flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <div
                        aria-label={`${month}: ${amount}%`}
                        className={`w-full max-w-7 rounded-t-md transition-colors ${
                          month === 'T10' ? 'bg-[#ADEBB3]' : 'bg-[#e8f4e9] hover:bg-[#ccebd0]'
                        }`}
                        style={{ height: `${amount}%` }}
                      />
                      <span className="absolute -bottom-6 text-[9px] text-[#98a39a] sm:text-[10px]">{month}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-10 flex items-center gap-2 text-xs text-[#849188]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#ADEBB3]" />
                Học phí đã thu
                <span className="ml-auto font-semibold text-[#4c7955]">Tháng 10 tăng 18,6%</span>
              </div>
            </article>

            <article className="rounded-2xl border border-[#edf0ec] bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <Text className="block !text-base !font-bold !text-[#354a3b]">Tình trạng thanh toán</Text>
                  <Text className="mt-1 block !text-xs !text-[#99a49b]">Học kỳ I · Năm học 2026–2027</Text>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fcebf1] text-[#cf7894]">
                  <CreditCardOutlined />
                </span>
              </div>
              <div className="mb-6 flex items-center gap-5 rounded-xl bg-[#f8faf8] p-4">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[10px] border-[#e8f5e9]">
                  <div className="absolute inset-[-10px] rounded-full border-[10px] border-transparent border-t-[#ADEBB3] border-r-[#ADEBB3] border-b-[#ADEBB3] -rotate-45" />
                  <div className="text-center">
                    <Text className="block !text-xl !font-bold !text-[#35533c]">78%</Text>
                    <Text className="block !text-[9px] !text-[#94a097]">Đã hoàn thành</Text>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleFilled className="text-[#82c58b]" />
                    <span className="text-xs text-[#69776e]">Đã thanh toán</span>
                    <span className="ml-auto pl-2 text-xs font-bold text-[#415a48]">2.527</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockCircleOutlined className="text-[#e2b65f]" />
                    <span className="text-xs text-[#69776e]">Chờ thanh toán</span>
                    <span className="ml-auto pl-2 text-xs font-bold text-[#415a48]">713</span>
                  </div>
                </div>
              </div>
              <a href="#transactions" className="flex items-center justify-between text-xs font-semibold text-[#5d8c66] no-underline hover:text-[#386c43]">
                Xem chi tiết thanh toán <ArrowRightOutlined />
              </a>
            </article>
          </section>

          <section id="transactions" className="overflow-hidden rounded-2xl border border-[#edf0ec] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
              <div>
                <Text className="block !text-base !font-bold !text-[#354a3b]">Giao dịch gần đây</Text>
                <Text className="mt-1 block !text-xs !text-[#99a49b]">Các khoản thanh toán mới nhất</Text>
              </div>
              <a href="#transactions" className="inline-flex items-center gap-2 text-xs font-semibold text-[#5d8c66] no-underline hover:text-[#386c43]">
                Xem tất cả <ArrowRightOutlined />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-[#f0f2ef] bg-[#fafbfa] text-[10px] font-bold uppercase tracking-[0.1em] text-[#a0aaa2]">
                    <th className="px-6 py-3 font-semibold">Người thanh toán</th>
                    <th className="px-4 py-3 font-semibold">Số tiền</th>
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-6 py-3 text-right font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={`${transaction.name}-${transaction.time}`} className="border-b border-[#f2f4f2] last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className={`!font-semibold ${transaction.tone}`}>{transaction.initials}</Avatar>
                          <div>
                            <Text className="block !text-xs !font-semibold !text-[#46574b]">{transaction.name}</Text>
                            <Text className="mt-1 block !text-[10px] !text-[#9aa49c]">{transaction.detail}</Text>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-[#45594a]">{transaction.amount}</td>
                      <td className="px-4 py-4 text-xs text-[#829087]">{transaction.time}</td>
                      <td className="px-4 py-4">
                        <Tag
                          className={`!m-0 !rounded-full !border-0 !px-2.5 !py-0.5 !text-[10px] !font-semibold ${
                            transaction.status === 'Thành công'
                              ? '!bg-[#eaf7eb] !text-[#5c9b67]'
                              : '!bg-[#fff3df] !text-[#bc914b]'
                          }`}
                        >
                          {transaction.status}
                        </Tag>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button type="text" aria-label={`Xem giao dịch của ${transaction.name}`} icon={<ArrowRightOutlined />} className="!text-[#91a096]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="py-6 text-center text-[11px] text-[#a4ada6]">
            © {new Date().getFullYear()} Học Phí Số <span className="mx-1">·</span> Quản lý học phí dễ dàng, an toàn
          </footer>
        </div>
      </div>
    </main>
    </>
  );
}

export default AdminDashboardPage;