import { Card, Avatar, Checkbox } from 'antd';
import { Token } from '@storage/blockchains';
import { cryptos } from '../../types';

import './TokenBoxImport.css';

const { Meta } = Card;

function TokenBoxImport(props: {
  chain: keyof cryptos;
  tokenInfo: Token;
  active: boolean;
  notSelectable: boolean;
  selectAction: (contract: string, value: boolean) => void;
}) {
  const triggerAction = (contract: string, value: boolean) => {
    if (props.notSelectable) {
      return;
    }
    props.selectAction(contract, value);
  };

  return (
    <div style={{ minWidth: '170px', width: 'calc(50% - 8px)' }}>
      <Card
        className={props.notSelectable ? 'not-selectable' : ''}
        hoverable
        size="small"
        onClick={() => triggerAction(props.tokenInfo.contract, !props.active)}
      >
        <Meta
          avatar={<Avatar src={props.tokenInfo.logo} size={30} />}
          title={
            <>
              <div style={{ float: 'left' }}>{props.tokenInfo.symbol}</div>
              <div style={{ float: 'right' }}>
                <Checkbox
                  checked={props.active}
                  onChange={(e) =>
                    triggerAction(props.tokenInfo.contract, e.target.checked)
                  }
                ></Checkbox>
              </div>
            </>
          }
          description={
            <>
              <div style={{ float: 'left' }}>{props.tokenInfo.name}</div>
            </>
          }
        />
      </Card>
    </div>
  );
}

export default TokenBoxImport;
