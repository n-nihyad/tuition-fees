import {
  CreditCardOutlined,
  DashboardOutlined,
  DownOutlined,
  GlobalOutlined,
  LogoutOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Select, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useLogout } from '@/features/auth/hooks/useLogout';

const { Text } = Typography;

function UserPortalHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const { submitLogout } = useLogout();
  const [language, setLanguage] = useState('vi');
  const isPaymentPage = pathname === '/user/payment';

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

  const profileMenu: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: () => void handleLogout(),
    },
  ];

  return (
    <>
    {contextHolder}
    <header className="sticky top-0 z-50 border-b border-[#edf0ec] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-fit items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#ADEBB3] text-[#315e3d]">
            <WalletOutlined className="text-lg" />
          </span>

          <div className="hidden sm:block">
            <Text className="block !text-base !font-bold !text-[#294331]">
              Học Phí Số
            </Text>
            <Text className="block !text-[10px] !font-medium !uppercase !tracking-[0.12em] !text-[#9ba69d]">
              Student Portal
            </Text>
          </div>
        </div>

        <nav aria-label="Điều hướng chính" className="ml-10 hidden h-full items-center md:flex">
          <button
            type="button"
            onClick={() => navigate('/user/dashboard')}
            aria-current={!isPaymentPage ? 'page' : undefined}
            className={`relative flex h-full items-center gap-2 border-0 bg-transparent px-5 text-sm font-semibold transition-colors ${
              !isPaymentPage
                ? 'text-[#43804f]'
                : 'text-[#748078] hover:text-[#43804f]'
            }`}
          >
            <DashboardOutlined />
            Tổng quan
            {!isPaymentPage && (
              <span className="absolute bottom-0 left-5 right-5 h-[2px] rounded-full bg-[#74b980]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/user/payment')}
            aria-current={isPaymentPage ? 'page' : undefined}
            className={`relative flex h-full items-center gap-2 border-0 bg-transparent px-5 text-sm font-semibold transition-colors ${
              isPaymentPage
                ? 'text-[#43804f]'
                : 'text-[#748078] hover:text-[#43804f]'
            }`}
          >
            <CreditCardOutlined />
            Thanh toán học phí
            {isPaymentPage && (
              <span className="absolute bottom-0 left-5 right-5 h-[2px] rounded-full bg-[#74b980]" />
            )}
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            <GlobalOutlined className="text-[#7c8b81]" />
            <Select
              value={language}
              onChange={setLanguage}
              variant="borderless"
              className="!w-[90px]"
              options={[
                { value: 'vi', label: 'VI' },
                { value: 'en', label: 'EN' },
              ]}
            />
          </div>

          <span className="hidden h-8 w-px bg-[#edf0ec] sm:block" />

          <Dropdown
            menu={{ items: profileMenu }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              type="button"
              className="flex cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-2 py-1.5 transition-colors hover:bg-[#f6f8f6]"
            >
              <Avatar className="!bg-[#f9dce6] !font-semibold !text-[#a85d77]">
                NH
              </Avatar>
              <div className="hidden text-left lg:block">
                <Text className="block !text-xs !font-bold !text-[#405246]">
                  Nguyễn Văn A
                </Text>
                <Text className="block !text-[10px] !text-[#9aa59c]">
                  Sinh viên
                </Text>
              </div>
              <DownOutlined className="text-[10px] text-[#8e9991]" />
            </button>
          </Dropdown>
        </div>
      </div>

      <nav aria-label="Điều hướng di động" className="flex border-t border-[#f1f3f1] px-4 md:hidden">
        <button
          type="button"
          onClick={() => navigate('/user/dashboard')}
          aria-current={!isPaymentPage ? 'page' : undefined}
          className={`flex flex-1 items-center justify-center gap-2 border-0 bg-transparent py-3 text-xs font-semibold ${
            !isPaymentPage ? 'text-[#43804f]' : 'text-[#879289]'
          }`}
        >
          <DashboardOutlined />
          Tổng quan
        </button>
        <button
          type="button"
          onClick={() => navigate('/user/payment')}
          aria-current={isPaymentPage ? 'page' : undefined}
          className={`flex flex-1 items-center justify-center gap-2 border-0 bg-transparent py-3 text-xs font-semibold ${
            isPaymentPage ? 'text-[#43804f]' : 'text-[#879289]'
          }`}
        >
          <CreditCardOutlined />
          Thanh toán học phí
        </button>
      </nav>
    </header>
    </>
  );
}

export default UserPortalHeader;
