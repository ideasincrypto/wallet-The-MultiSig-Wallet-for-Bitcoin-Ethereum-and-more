import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Modal,
  message,
  QRCode,
  Space,
  Popconfirm,
  Tooltip,
} from 'antd';
import { NoticeType } from 'antd/es/message/interface';
const { Paragraph, Text } = Typography;
import { useAppSelector } from '../../hooks';
import { getFingerprint } from '../../lib/fingerprint';
import { generateAddressKeypair, getScriptType } from '../../lib/wallet';
import { decrypt as passworderDecrypt } from '@metamask/browser-passworder';
import secureLocalStorage from 'react-secure-storage';
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  ExclamationCircleFilled,
  CopyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { blockchains } from '@storage/blockchains';

function AddressDetails(props: {
  open: boolean;
  openAction: (status: boolean) => void;
}) {
  const { t } = useTranslation(['home', 'common', 'cr']);
  const [privKey, setPrivKey] = useState('');
  const [redeemScriptVisible, setRedeemScriptVisible] = useState(false);
  const [witnessScriptVisible, setWitnessScriptVisible] = useState(false);
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
  const [privKeyCopyingVisible, setPrivKeyCopyingVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  // private key, redeemScript, address
  const { open, openAction } = props;
  const { activeChain } = useAppSelector((state) => state.sspState);
  const { wallets, walletInUse } = useAppSelector(
    (state) => state[activeChain],
  );
  const { passwordBlob } = useAppSelector((state) => state.passwordBlob);
  const blockchainConfig = blockchains[activeChain];
  const displayMessage = (type: NoticeType, content: string) => {
    void messageApi.open({
      type,
      content,
    });
  };

  useEffect(() => {
    // reset state
    if (!open) {
      setPrivKey('');
      console.log('reset state');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      generateAddressInformation();
    }
  }, [walletInUse, activeChain, open]);

  const handleOk = () => {
    setRedeemScriptVisible(false);
    setWitnessScriptVisible(false);
    setPrivateKeyVisible(false);
    openAction(false);
  };

  const generateAddressInformation = () => {
    // get our password to decrypt xpriv from secure storage
    const fingerprint: string = getFingerprint();
    passworderDecrypt(fingerprint, passwordBlob)
      .then(async (password) => {
        if (typeof password !== 'string') {
          throw new Error(t('home:sspWalletDetails.err_pw_not_valid'));
        }
        const xprivBlob = secureLocalStorage.getItem(
          `xpriv-48-${blockchainConfig.slip}-0-${getScriptType(
            blockchainConfig.scriptType,
          )}-${blockchainConfig.id}`,
        );
        if (typeof xprivBlob !== 'string') {
          throw new Error(t('home:sspWalletDetails.err_invalid_wallet_xpriv'));
        }
        let xprivChain = await passworderDecrypt(password, xprivBlob);
        if (typeof xprivChain !== 'string') {
          throw new Error(
            t('home:sspWalletDetails.err_invalid_wallet_xpriv_2'),
          );
        }
        const splittedDerPath = walletInUse.split('-');
        const typeIndex = Number(splittedDerPath[0]) as 0 | 1;
        const addressIndex = Number(splittedDerPath[1]);
        const keyPair = generateAddressKeypair(
          xprivChain,
          typeIndex,
          addressIndex,
          activeChain,
        );
        // reassign xprivChain to null as it is no longer needed
        xprivChain = null;
        password = null;
        setPrivKey(keyPair.privKey);
      })
      .catch((error) => {
        console.log(error);
        displayMessage('error', t('home:sspWalletDetails.err_s1'));
      });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={t('home:addressDetails.chain_bip', {
          chain: blockchainConfig.symbol,
        })}
        open={open}
        onOk={handleOk}
        style={{ textAlign: 'center', top: 60 }}
        onCancel={handleOk}
        footer={[
          <Button key="ok" type="primary" onClick={handleOk}>
            {t('common:ok')}
          </Button>,
        ]}
      >
        <h3 className="detailsTitleWithDescription">
          {t('home:receive.wallet_address')}:
        </h3>
        <Paragraph type="secondary" className="detailsDescription">
          <blockquote>{t('home:receive.wallet_address_desc')}</blockquote>
        </Paragraph>
        <Space direction="vertical" size="small">
          <QRCode
            errorLevel="H"
            value={wallets[walletInUse].address}
            icon="/ssp-logo-black.svg"
            size={256}
            style={{ margin: '0 auto' }}
          />
          <Paragraph
            copyable={{ text: wallets[walletInUse].address }}
            className="copyableAddress"
          >
            <Text>{wallets[walletInUse].address}</Text>
          </Paragraph>
        </Space>
        {wallets[walletInUse].redeemScript && (
          <>
            <h3 className="detailsTitleWithDescription">
              {redeemScriptVisible && (
                <EyeTwoTone onClick={() => setRedeemScriptVisible(false)} />
              )}
              {!redeemScriptVisible && (
                <EyeInvisibleOutlined
                  onClick={() => setRedeemScriptVisible(true)}
                />
              )}{' '}
              {t('home:addressDetails.wallet_redeem_script')}:
            </h3>
            <Paragraph type="secondary" className="detailsDescription">
              <blockquote>
                {t('home:addressDetails.wallet_redeem_script_desc')}
              </blockquote>
            </Paragraph>
            <Space direction="vertical" size="small">
              <Paragraph
                copyable={{ text: wallets[walletInUse].redeemScript }}
                className="copyableAddress"
              >
                <Text>
                  {redeemScriptVisible
                    ? wallets[walletInUse].redeemScript
                    : '*** *** *** *** *** ***'}
                </Text>
              </Paragraph>
            </Space>
          </>
        )}
        {wallets[walletInUse].witnessScript && (
          <>
            <h3 className="detailsTitleWithDescription">
              {witnessScriptVisible && (
                <EyeTwoTone onClick={() => setWitnessScriptVisible(false)} />
              )}
              {!witnessScriptVisible && (
                <EyeInvisibleOutlined
                  onClick={() => setWitnessScriptVisible(true)}
                />
              )}{' '}
              {t('home:addressDetails.wallet_witness_script')}:
            </h3>
            <Paragraph type="secondary" className="detailsDescription">
              <blockquote>
                {t('home:addressDetails.wallet_witness_script_desc')}
              </blockquote>
            </Paragraph>
            <Space direction="vertical" size="small">
              <Paragraph
                copyable={{ text: wallets[walletInUse].witnessScript }}
                className="copyableAddress"
              >
                <Text>
                  {witnessScriptVisible
                    ? wallets[walletInUse].witnessScript
                    : '*** *** *** *** *** ***'}
                </Text>
              </Paragraph>
            </Space>
          </>
        )}
        <h3 className="detailsTitleWithDescription">
          {privateKeyVisible && (
            <EyeTwoTone onClick={() => setPrivateKeyVisible(false)} />
          )}
          {!privateKeyVisible && (
            <Popconfirm
              title={t('home:sspWalletDetails.show_data', {
                data: t('home:addressDetails.wallet_priv_key', {
                  chain: blockchainConfig.name,
                }),
              })}
              description={
                <Space
                  direction="vertical"
                  size={'middle'}
                  style={{ marginTop: 12, marginBottom: 12 }}
                >
                  <span>
                    {t('cr:show_sensitive_data', {
                      sensitive_data: t('home:addressDetails.wallet_priv_key'),
                    })}
                  </span>
                  <span>{t('cr:copy_anyone_can_read')}</span>
                </Space>
              }
              overlayStyle={{ maxWidth: 360, margin: 10 }}
              okText={t('common:confirm')}
              cancelText={t('common:cancel')}
              onConfirm={() => {
                setPrivateKeyVisible(true);
              }}
              icon={<ExclamationCircleFilled style={{ color: 'orange' }} />}
            >
              <EyeInvisibleOutlined />
            </Popconfirm>
          )}{' '}
          {t('home:addressDetails.wallet_priv_key')}:
        </h3>
        <Paragraph type="secondary" className="detailsDescription">
          <blockquote>
            {t('home:addressDetails.wallet_priv_key_desc')}
          </blockquote>
        </Paragraph>
        <Space direction="vertical" size="small">
          <Paragraph className="copyableAddress">
            <Text>
              {privateKeyVisible ? privKey : '*** *** *** *** *** ***'}{' '}
              <Tooltip title={'Copy'}>
                <Button
                  type="link"
                  size="small"
                  color="primary"
                  className="copyableIcon"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    setPrivKeyCopyingVisible(true);
                  }}
                ></Button>
              </Tooltip>
            </Text>
          </Paragraph>
        </Space>
      </Modal>
      <Modal
        title={t('cr:copy_sensitive_data', {
          sensitive_data: t('home:addressDetails.wallet_priv_key'),
        })}
        open={privKeyCopyingVisible}
        onOk={() => setPrivKeyCopyingVisible(false)}
        style={{ textAlign: 'center', top: 60 }}
        onCancel={() => setPrivKeyCopyingVisible(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => setPrivKeyCopyingVisible(false)}
          >
            {t('cr:finished')}
          </Button>,
        ]}
      >
        <h3>
          {t('cr:copy_sensitive_data_split', {
            sensitive_data: t('home:addressDetails.wallet_priv_key'),
          })}
        </h3>
        <Space direction="vertical" size="middle">
          <Button
            type="dashed"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(
                privKey.substring(0, Math.round(privKey.length / 2)),
              );
              displayMessage('success', t('cr:copied'));
            }}
          >
            {t('cr:copy_part_x', { part: 1 })}
          </Button>
          <Button
            type="dashed"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(
                privKey.substring(
                  Math.round(privKey.length / 2),
                  privKey.length,
                ),
              );
              displayMessage('success', t('cr:copied'));
            }}
          >
            {t('cr:copy_part_x', { part: 2 })}
          </Button>
        </Space>
      </Modal>
    </>
  );
}

export default AddressDetails;
