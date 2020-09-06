import clsx from 'clsx';
import React from 'react';
import Modal from 'react-modal';

export default function CustomModal(props: Modal.Props & { children?: React.ReactChild | React.ReactChild[] }) {
  const { className, overlayClassName, ...restProps } = props;

  return (
    <Modal
      {...restProps}
      className={clsx('p-6 bg-gray-900 border border-white rounded', className)}
      appElement={document.getElementById('root')!}
      overlayClassName={
        clsx(
          'fixed top-0 left-0 right-0 bottom-0 bg-gray-900 bg-opacity-50 flex items-center justify-center',
          overlayClassName
        )
      }
    />
  );
}
