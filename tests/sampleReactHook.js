import { useSelector } from './mockUseSelector';

const useSampleReactHook = () => {
    const mock = useSelector((state) => s.foo.bar);
};

const useSampleReactHook2 = () => {
    return useSelector((state) => state.foo.map((x) => x));
};
