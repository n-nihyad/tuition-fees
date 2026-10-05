import { CreditCardOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router';
import UserPortalHeader from '@/components/UserPortalHeader';

const { Text, Title } = Typography;

function UserDashboardPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#f7f9f7] text-[#25382c]">
      <UserPortalHeader />

      {/* ================= PAGE CONTENT ================= */}
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <section className="mb-8">
              <Text className="mb-1 block !text-xs !font-semibold !uppercase !tracking-[0.12em] !text-[#9aa59c]">
                Tổng quan
              </Text>

              <Title
                level={2}
                className="!mb-1 !text-[26px] !font-semibold !tracking-tight !text-[#283d2f]"
              >
                Xin chào, Nguyễn Văn A 👋
              </Title>

              <Text className="!text-sm !text-[#87938a]">
                Theo dõi và quản lý học phí của bạn tại đây.
              </Text>
        </section>

        {/* Tuition summary */}
        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">

              <article className="rounded-2xl border border-[#edf0ec] bg-white p-6">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <Text className="block !text-sm !font-semibold !text-[#405246]">
                      Học phí học kỳ hiện tại
                    </Text>

                    <Text className="mt-1 block !text-xs !text-[#99a49b]">
                      Học kỳ I · Năm học 2026–2027
                    </Text>
                  </div>

                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f7eb] text-[#6eaa78]">
                    <CreditCardOutlined />
                  </span>
                </div>

                <div className="mb-6">
                  <Text className="block !text-xs !text-[#929e95]">
                    Tổng học phí
                  </Text>

                  <Text className="mt-1 block !text-[28px] !font-bold !tracking-tight !text-[#2f4736]">
                    18.500.000đ
                  </Text>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#f7faf7] p-4">
                    <Text className="block !text-xs !text-[#929e95]">
                      Đã thanh toán
                    </Text>

                    <Text className="mt-1 block !text-lg !font-bold !text-[#5d9768]">
                      10.000.000đ
                    </Text>
                  </div>

                  <div className="rounded-xl bg-[#fff9ef] p-4">
                    <Text className="block !text-xs !text-[#929e95]">
                      Còn phải thanh toán
                    </Text>

                    <Text className="mt-1 block !text-lg !font-bold !text-[#c99142]">
                      8.500.000đ
                    </Text>
                  </div>
                </div>
              </article>

              {/* Payment action */}
              <article className="flex flex-col rounded-2xl border border-[#edf0ec] bg-white p-6">
                <Text className="block !text-sm !font-semibold !text-[#405246]">
                  Thanh toán học phí
                </Text>

                <Text className="mt-2 block !text-xs !leading-5 !text-[#939e96]">
                  Bạn còn khoản học phí cần hoàn thành trong học kỳ này.
                </Text>

                <div className="my-5 rounded-xl bg-[#f7faf7] p-4">
                  <Text className="block !text-xs !text-[#929e95]">
                    Số tiền cần thanh toán
                  </Text>

                  <Text className="mt-1 block !text-xl !font-bold !text-[#344c3b]">
                    8.500.000đ
                  </Text>
                </div>

                <Button
                  type="primary"
                  icon={<CreditCardOutlined />}
                  onClick={() => navigate('/user/payment')}
                  className="
                    !mt-auto
                    !h-11
                    !rounded-xl
                    !border-[#79ba83]
                    !bg-[#79ba83]
                    !font-semibold
                    hover:!border-[#68a973]
                    hover:!bg-[#68a973]
                  "
                >
                  Thanh toán ngay
                </Button>
              </article>
        </section>

        {/* Recent payments */}
        <section className="mt-6 rounded-2xl border border-[#edf0ec] bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <Text className="block !text-sm !font-semibold !text-[#405246]">
                    Thanh toán gần đây
                  </Text>

                  <Text className="mt-1 block !text-xs !text-[#99a49b]">
                    Lịch sử các khoản học phí đã thanh toán
                  </Text>
                </div>

                <Button
                  type="link"
                  onClick={() => navigate('/user/payment')}
                  className="!p-0 !text-xs !font-semibold !text-[#5e9067]"
                >
                  Xem tất cả
                </Button>
              </div>

              <div className="rounded-xl border border-[#f0f2ef] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Text className="block !text-xs !font-semibold !text-[#46574b]">
                      Học phí đợt 1
                    </Text>

                    <Text className="mt-1 block !text-[11px] !text-[#9aa49c]">
                      15/09/2026 · Học kỳ I
                    </Text>
                  </div>

                  <div className="text-right">
                    <Text className="block !text-sm !font-bold !text-[#405246]">
                      10.000.000đ
                    </Text>

                    <Text className="!text-[11px] !font-semibold !text-[#69a574]">
                      Thành công
                    </Text>
                  </div>
                </div>
              </div>
        </section>
      </div>
    </main>
  );
}

export default UserDashboardPage;