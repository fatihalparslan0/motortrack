import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';

export interface TabPagerRef {
  setPage: (index: number) => void;
}

interface TabPagerProps {
  initialPage?: number;
  onPageSelected: (index: number) => void;
  children: React.ReactNode[];
}

export const TabPager = forwardRef<TabPagerRef, TabPagerProps>(
  ({ initialPage = 0, onPageSelected, children }, ref) => {
    const pagerRef = useRef<PagerView>(null);

    useImperativeHandle(ref, () => ({
      setPage: (index: number) => {
        pagerRef.current?.setPage(index);
      },
    }));

    return (
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={(e) => onPageSelected(e.nativeEvent.position)}
      >
        {React.Children.map(children, (child, index) => (
          <View key={index} style={styles.page}>
            {child}
          </View>
        ))}
      </PagerView>
    );
  }
);

TabPager.displayName = 'TabPager';

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
