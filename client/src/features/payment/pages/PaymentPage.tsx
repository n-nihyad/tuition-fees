import { CreditCardOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import UserPortalHeader from '@/components/UserPortalHeader';

const { Text, Title } = Typography;

function PaymentPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f7] text-[#25382c]">
      <UserPortalHeader />
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
        <section>
          <Title
            level={2}
            className="!mb-1 !text-[26px] !font-semibold !text-[#283d2f]"
          >
            Thanh toán học phí
          </Title>

          <Text className="!text-sm !text-[#87938a]">
            Xem các khoản học phí và thực hiện thanh toán.
          </Text>

          <div className="mt-7 rounded-2xl border border-[#edf0ec] bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f7eb] text-[#6eaa78]">
              <CreditCardOutlined />
            </div>
            Nội dung trang thanh toán học phí.
          </div>
        </section>
      </div>
    </main>
  );
}

export default PaymentPage;
