import { CreateStyled } from '@emotion/styled';

/**
 * Use this function when we want to pass custom props to styled HTML Element without error
 * It stop emotion from passing any props starting with $ to HTML Elelement
 * @example
 * // define styled component
 * const StyledModalLayout = styled(Grid, filterTransientProps)<{ $isLoading: boolean }>`
 *  width: 100%;
 *  height: 100%;
 *  filter: ${(props) => props.$isLoading && 'blur(5px)'};
 *`;
 *
 * // component usage
 *      <StyledModalLayout
          ...
          $isLoading={isLoading}
        >...</StyledModalLayout>
 */
export const filterTransientProps: Parameters<CreateStyled>[1] = {
  shouldForwardProp: (propName: string) => !propName.startsWith('$'),
};
