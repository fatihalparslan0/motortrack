import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet } from 'react-native';

export interface TabPagerRef {
  setPage: (index: number) => void;
}

interface TabPagerProps {
  initialPage?: number;
  onPageSelected: (index: number) => void;
  children: React.ReactNode[];
}

export const TabPager = forwardRef<TabPagerRef, TabPagerProps>(
  ({ initialPage = 0, children }, ref) => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    useImperativeHandle(ref, () => ({
      setPage: (index: number) => {
        setCurrentPage(index);
      },
    }));

    return (
      <View style={styles.pager}>
        {React.Children.map(children, (child, index) => (
          <View
            key={index}
            style={[
              styles.page,
              { display: currentPage === index ? 'flex' : 'none' },
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    );
  }
);

TabPager.displayName = 'TabPager';

const styles = StyleSheet.create({
  pager: {
    flex: 1,
    overflow: 'hidden',
  },
  page: {
    flex: 1,
    height: '100%',
  },
});
