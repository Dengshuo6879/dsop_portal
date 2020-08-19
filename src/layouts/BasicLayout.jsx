import React from 'react';
import { Link, connect, history } from 'umi';
import styles from './BasicLayout.less';

const BasicLayout = (props) => {
  const {
    dispatch,
    children,
    settings,
    location = {
      pathname: '/',
    },
  } = props;

  return (
    <div>
      <div className={styles.header}>Header</div>
      <div className={styles.content}>
        <div className={styles.center}>{children}</div>
        <div className={styles.footer}>Footer</div>
      </div>
    </div>
  );
};

export default connect(({}) => ({}))(BasicLayout);
